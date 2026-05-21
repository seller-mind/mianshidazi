// 语音限额API
// 免费用户每天3条语音，付费用户无限
// GET: 查剩余次数  POST: 消耗1次

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const FREE_VOICE_DAILY_LIMIT = 3;

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

// 检查是否有有效付费订阅
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

// 重置过期的每日语音计数
async function resetIfExpired(supabase: ReturnType<typeof getSupabase>, userId: string, user: any) {
  const now = new Date();
  const resetAt = user?.free_voice_reset_at ? new Date(user.free_voice_reset_at) : null;
  if (!resetAt || resetAt.toDateString() !== now.toDateString()) {
    await supabase
      .from('users')
      .update({ free_voice_used: 0, free_voice_reset_at: now.toISOString() })
      .eq('id', userId);
    return 0;
  }
  return user?.free_voice_used || 0;
}

// GET - 查询剩余语音次数
export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ remaining: 0, limit: FREE_VOICE_DAILY_LIMIT, isFree: true });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ remaining: 0, limit: FREE_VOICE_DAILY_LIMIT, isFree: true });
    }

    const supabase = getSupabase();

    if (await hasActiveSubscription(supabase, decoded.userId)) {
      return NextResponse.json({ remaining: -1, limit: -1, isFree: false });
    }

    const { data: user } = await supabase
      .from('users')
      .select('free_voice_used, free_voice_reset_at')
      .eq('id', decoded.userId)
      .single();

    const used = await resetIfExpired(supabase, decoded.userId, user);
    const remaining = Math.max(0, FREE_VOICE_DAILY_LIMIT - used);

    return NextResponse.json({ remaining, limit: FREE_VOICE_DAILY_LIMIT, isFree: true, used });
  } catch (error) {
    console.error('Voice limit check error:', error);
    return NextResponse.json({ remaining: 0, limit: FREE_VOICE_DAILY_LIMIT, isFree: true });
  }
}

// POST - 消耗1次语音额度
export async function POST(request: NextRequest) {
  try {
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

    if (await hasActiveSubscription(supabase, decoded.userId)) {
      return NextResponse.json({ success: true, remaining: -1 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('free_voice_used, free_voice_reset_at')
      .eq('id', decoded.userId)
      .single();

    const used = await resetIfExpired(supabase, decoded.userId, user);

    if (used >= FREE_VOICE_DAILY_LIMIT) {
      return NextResponse.json({
        error: '今日免费语音次数已用完',
        remaining: 0,
        isFree: true,
      }, { status: 403 });
    }

    await supabase
      .from('users')
      .update({ free_voice_used: used + 1 })
      .eq('id', decoded.userId);

    return NextResponse.json({
      success: true,
      remaining: FREE_VOICE_DAILY_LIMIT - used - 1,
      isFree: true,
    });
  } catch (error) {
    console.error('Voice consume error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
