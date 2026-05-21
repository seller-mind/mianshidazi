// TTS API v3 - 流式代理音频 + 免费用户限额
// 免费用户每天10条TTS，付费用户无限

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const TTS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';
const FREE_TTS_DAILY_LIMIT = 10;

const PERSONA_VOICE: Record<string, string> = {
  A: 'longanwen_v3',
  B: 'longanlang_v3',
  C: 'longcheng_v3',
  D: 'longyingmu_v3',
  E: 'longzhe_v3',
};
const COMPANION_VOICE = 'longxiaochun_v3';
const COMPANION_RATE = 0.9;
const INTERVIEW_RATE = 0.95;

function getToken(request: NextRequest): string | null {
  let token = request.cookies.get('msd_token')?.value;
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
  }
  return token || null;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function hasActiveSubscription(supabase: ReturnType<typeof getSupabase>, userId: string): Promise<boolean> {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, status, expires_at')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (!subs || subs.length === 0) return false;
  const now = new Date();
  return subs.some(s => !s.expires_at || new Date(s.expires_at) > now);
}

async function checkAndConsumeTTS(supabase: ReturnType<typeof getSupabase>, userId: string): Promise<{ allowed: boolean; remaining: number; isFree: boolean }> {
  if (await hasActiveSubscription(supabase, userId)) {
    return { allowed: true, remaining: -1, isFree: false };
  }

  const { data: user } = await supabase
    .from('users')
    .select('free_tts_used, free_tts_reset_at')
    .eq('id', userId)
    .single();

  const now = new Date();
  const resetAt = user?.free_tts_reset_at ? new Date(user.free_tts_reset_at) : null;
  let used = user?.free_tts_used || 0;

  if (!resetAt || resetAt.toDateString() !== now.toDateString()) {
    used = 0;
    await supabase
      .from('users')
      .update({ free_tts_used: 0, free_tts_reset_at: now.toISOString() })
      .eq('id', userId);
  }

  if (used >= FREE_TTS_DAILY_LIMIT) {
    return { allowed: false, remaining: 0, isFree: true };
  }

  await supabase
    .from('users')
    .update({ free_tts_used: used + 1 })
    .eq('id', userId);

  return { allowed: true, remaining: FREE_TTS_DAILY_LIMIT - used - 1, isFree: true };
}

function cleanText(text: string): string {
  return text
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[[\【][^】\]]*[】\]]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/✅✨👉💡🔥☕😅🌙/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/[～~]/g, '，')
    .replace(/→/g, '到')
    .replace(/—+/g, '——')
    .replace(/\n+/g, '；')
    .replace(/；{2,}/g, '；')
    .replace(/。{2,}/g, '。')
    .replace(/，{2,}/g, '，')
    .trim();
}

async function getAudioUrl(text: string, persona: string, isCompanion: boolean): Promise<string | null> {
  if (!DASHSCOPE_API_KEY) return null;

  const voice = isCompanion ? COMPANION_VOICE : (PERSONA_VOICE[persona] || PERSONA_VOICE['A']);
  const rate = isCompanion ? COMPANION_RATE : INTERVIEW_RATE;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'cosyvoice-v3-flash',
        input: { text, voice, format: 'mp3', sample_rate: 24000, rate },
        parameters: { stream: true },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[TTS] failed:', response.status);
      return null;
    }

    const data = await response.json();
    const audioUrl = data?.output?.audio?.url;
    return audioUrl ? audioUrl.replace(/^http:/, 'https:') : null;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[TTS] error:', (err as Error).message);
    return null;
  }
}

// POST: 返回音频URL（用于预加载）
export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: '请先登录', ttsLimit: true }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  } catch {
    return NextResponse.json({ error: '登录已过期', ttsLimit: true }, { status: 401 });
  }

  const supabase = getSupabase();
  const ttsCheck = await checkAndConsumeTTS(supabase, decoded.userId);
  if (!ttsCheck.allowed) {
    return NextResponse.json({
      error: '今日免费朗读次数已用完',
      ttsLimit: true,
      remaining: 0,
      isFree: true,
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    const text = body.text || '';
    const persona = body.persona || 'A';
    const isCompanion = body.isCompanion === true;

    const cleaned = cleanText(text);
    if (!cleaned) {
      if (ttsCheck.isFree) {
        const { data: user } = await supabase.from('users').select('free_tts_used').eq('id', decoded.userId).single();
        if (user) {
          await supabase.from('users').update({ free_tts_used: Math.max(0, (user.free_tts_used || 1) - 1) }).eq('id', decoded.userId);
        }
      }
      return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
    }

    const audioUrl = await getAudioUrl(cleaned, persona, isCompanion);
    if (!audioUrl) {
      if (ttsCheck.isFree) {
        const { data: user } = await supabase.from('users').select('free_tts_used').eq('id', decoded.userId).single();
        if (user) {
          await supabase.from('users').update({ free_tts_used: Math.max(0, (user.free_tts_used || 1) - 1) }).eq('id', decoded.userId);
        }
      }
      return NextResponse.json({ error: '合成失败' }, { status: 500 });
    }

    return NextResponse.json({ url: audioUrl, ttsRemaining: ttsCheck.remaining });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}

// GET: 直接代理音频流
export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: '请先登录', ttsLimit: true }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  } catch {
    return NextResponse.json({ error: '登录已过期', ttsLimit: true }, { status: 401 });
  }

  const supabase = getSupabase();
  const ttsCheck = await checkAndConsumeTTS(supabase, decoded.userId);
  if (!ttsCheck.allowed) {
    return NextResponse.json({
      error: '今日免费朗读次数已用完',
      ttsLimit: true,
      remaining: 0,
    }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || '';
  const persona = searchParams.get('persona') || 'A';
  const isCompanion = searchParams.get('isCompanion') === 'true';

  const cleaned = cleanText(text);
  if (!cleaned) {
    return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
  }

  const audioUrl = await getAudioUrl(cleaned, persona, isCompanion);
  if (!audioUrl) {
    return NextResponse.json({ error: '合成失败' }, { status: 500 });
  }

  try {
    const audioResponse = await fetch(audioUrl, {
      headers: { 'Accept': 'audio/mpeg' },
    });

    if (!audioResponse.ok) {
      return NextResponse.json({ error: '音频下载失败' }, { status: 500 });
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'X-TTS-Remaining': String(ttsCheck.remaining),
      },
    });
  } catch {
    return NextResponse.json({ error: '音频代理失败' }, { status: 500 });
  }
}
