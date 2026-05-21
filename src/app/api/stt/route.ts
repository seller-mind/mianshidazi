// STT API - 语音转文字
// 使用硅基流动SenseVoiceSmall（免费）替代阿里云qwen3-asr-flash
// 免费用户每日语音限额检查

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const SILICONFLOW_STT_URL = 'https://api.siliconflow.cn/v1/audio/transcriptions';

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
  // 付费用户直接通过
  if (await hasActiveSubscription(supabase, userId)) {
    return { allowed: true, remaining: -1, isFree: false };
  }

  // 免费用户检查
  const { data: user } = await supabase
    .from('users')
    .select('free_voice_used, free_voice_reset_at')
    .eq('id', userId)
    .single();

  const now = new Date();
  const resetAt = user?.free_voice_reset_at ? new Date(user.free_voice_reset_at) : null;
  let used = user?.free_voice_used || 0;

  // 非今天则重置
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

  // 扣次数
  await supabase
    .from('users')
    .update({ free_voice_used: used + 1 })
    .eq('id', userId);

  return { allowed: true, remaining: FREE_VOICE_DAILY_LIMIT - used - 1, isFree: true };
}

export async function POST(request: NextRequest) {
  // 先检查语音额度
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

  if (!SILICONFLOW_API_KEY) {
    return NextResponse.json({ error: 'STT未配置' }, { status: 500 });
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
      // 音频太短，退回刚才扣的次数
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

    // 使用硅基流动SenseVoiceSmall（兼容OpenAI API格式）
    const sttFormData = new FormData();
    sttFormData.append('model', 'FunAudioLLM/SenseVoiceSmall');
    sttFormData.append('file', audioFile);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(SILICONFLOW_STT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
        },
        body: sttFormData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.error('[STT] SiliconFlow API failed:', response.status, errText);
        return NextResponse.json({ error: '语音识别服务异常' }, { status: 500 });
      }

      const data = await response.json();
      // OpenAI兼容格式返回: { text: "..." }
      const text = data.text?.trim() || '';

      console.log(`[STT] result: "${text}"`);

      if (!text) {
        return NextResponse.json({ error: '未识别到内容，请再说一次' }, { status: 400 });
      }

      return NextResponse.json({ text, voiceRemaining: voiceCheck.remaining });

    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err as Error;
      if (error.name === 'AbortError') {
        return NextResponse.json({ error: '识别超时，请重试' }, { status: 504 });
      }
      throw error;
    }

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[STT] error:', error.message);
    return NextResponse.json({ error: error.message || '语音识别失败' }, { status: 500 });
  }
}
