// STT API - 语音转文字
// 优化：优先使用硅基流动 SenseVoiceSmall（免费），失败时 fallback 阿里云 qwen3-asr-flash
// 免费用户每日语音限额检查

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;

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

const FREE_VOICE_DAILY_LIMIT = 3;

async function hasActiveSubscription(supabase: ReturnType<typeof getSupabase>, userId: string): Promise<boolean> {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, plan_id, status, expires_at')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (!subs || subs.length === 0) return false;
  const now = new Date();
  return subs.some(s => !s.expires_at || new Date(s.expires_at) > now);
}

async function checkAndConsumeVoice(supabase: ReturnType<typeof getSupabase>, userId: string): Promise<{ allowed: boolean; remaining: number; isFree: boolean }> {
  if (await hasActiveSubscription(supabase, userId)) {
    return { allowed: true, remaining: -1, isFree: false };
  }

  const { data: user } = await supabase
    .from('users')
    .select('free_voice_used, free_voice_reset_at')
    .eq('id', userId)
    .single();

  const now = new Date();
  const resetAt = user?.free_voice_reset_at ? new Date(user.free_voice_reset_at) : null;
  let used = user?.free_voice_used || 0;

  if (!resetAt || resetAt.toDateString() !== now.toDateString()) {
    used = 0;
    await supabase
      .from('users')
      .update({ free_voice_used: 0, free_voice_reset_at: now.toISOString() })
      .eq('id', userId);
  }

  if (used >= FREE_VOICE_DAILY_LIMIT) {
    return { allowed: false, remaining: 0, isFree: true };
  }

  await supabase
    .from('users')
    .update({ free_voice_used: used + 1 })
    .eq('id', userId);

  return { allowed: true, remaining: FREE_VOICE_DAILY_LIMIT - used - 1, isFree: true };
}

// 硅基流动 SenseVoiceSmall（免费）
async function recognizeWithSiliconFlow(audioBuffer: Buffer, mimeType: string): Promise<string | null> {
  if (!SILICONFLOW_API_KEY) return null;

  const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mp3') ? 'mp3' : 'wav';
  const filename = `audio.${ext}`;

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: mimeType }), filename);
  formData.append('model', 'FunAudioLLM/SenseVoiceSmall');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[STT-SiliconFlow] failed:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = (data.text || '').trim();
    console.log(`[STT-SiliconFlow] result: "${text}"`);
    return text || null;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    console.error('[STT-SiliconFlow] error:', error.message);
    return null;
  }
}

// 阿里云 qwen3-asr-flash（fallback，¥0.00022/秒）
async function recognizeWithDashScope(audioBuffer: Buffer, mimeType: string): Promise<string | null> {
  if (!DASHSCOPE_API_KEY) return null;

  const base64Audio = audioBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64Audio}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen3-asr-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'input_audio',
                input_audio: {
                  data: dataUri,
                },
              },
            ],
          },
        ],
        stream: false,
        extra_body: {
          asr_options: {
            enable_itn: false,
          },
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[STT-DashScope] failed:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    console.log(`[STT-DashScope] result: "${text}"`);
    return text || null;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    console.error('[STT-DashScope] error:', error.message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  } catch {
    return NextResponse.json({ error: '登录已过期' }, { status: 401 });
  }

  const supabase = getSupabase();
  const voiceCheck = await checkAndConsumeVoice(supabase, decoded.userId);
  if (!voiceCheck.allowed) {
    return NextResponse.json({
      error: '今日免费语音次数已用完',
      voiceLimit: true,
      remaining: 0,
      isFree: true,
    }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile || audioFile.size < 500) {
      if (voiceCheck.isFree) {
        const { data: user } = await supabase
          .from('users')
          .select('free_voice_used')
          .eq('id', decoded.userId)
          .single();
        if (user) {
          await supabase
            .from('users')
            .update({ free_voice_used: Math.max(0, (user.free_voice_used || 1) - 1) })
            .eq('id', decoded.userId);
        }
      }
      return NextResponse.json({ error: '音频太短' }, { status: 400 });
    }

    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '音频文件过大' }, { status: 400 });
    }

    console.log(`[STT] received audio: ${audioFile.name}, size=${audioFile.size}, type=${audioFile.type}`);

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || 'audio/webm';

    // 优先硅基流动（免费），失败 fallback 阿里云
    let text = await recognizeWithSiliconFlow(audioBuffer, mimeType);

    if (!text) {
      console.log('[STT] SiliconFlow failed, falling back to DashScope');
      text = await recognizeWithDashScope(audioBuffer, mimeType);
    }

    if (!text) {
      return NextResponse.json({ error: '未识别到内容，请再说一次' }, { status: 400 });
    }

    return NextResponse.json({ text, voiceRemaining: voiceCheck.remaining });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[STT] error:', error.message);
    return NextResponse.json({ error: error.message || '语音识别失败' }, { status: 500 });
  }
}
