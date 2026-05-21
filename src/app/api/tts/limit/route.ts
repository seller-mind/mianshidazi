// TTS额度查询API
// GET: 查询今日TTS剩余次数

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const FREE_TTS_DAILY_LIMIT = 10;

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

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ remaining: 0, limit: FREE_TTS_DAILY_LIMIT, isFree: true });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ remaining: 0, limit: FREE_TTS_DAILY_LIMIT, isFree: true });
    }

    const supabase = getSupabase();

    // 检查是否有付费订阅
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, status, expires_at')
      .eq('user_id', decoded.userId)
      .eq('status', 'active');
    
    const now = new Date();
    const hasActive = subs?.some(s => !s.expires_at || new Date(s.expires_at) > now);
    
    if (hasActive) {
      return NextResponse.json({ remaining: -1, limit: -1, isFree: false });
    }

    // 免费用户
    const { data: user } = await supabase
      .from('users')
      .select('free_tts_used, free_tts_reset_at')
      .eq('id', decoded.userId)
      .single();

    const resetAt = user?.free_tts_reset_at ? new Date(user.free_tts_reset_at) : null;
    let used = user?.free_tts_used || 0;

    if (!resetAt || resetAt.toDateString() !== now.toDateString()) {
      used = 0;
    }

    const remaining = Math.max(0, FREE_TTS_DAILY_LIMIT - used);
    return NextResponse.json({ remaining, limit: FREE_TTS_DAILY_LIMIT, isFree: true, used });
  } catch (error) {
    console.error('TTS limit check error:', error);
    return NextResponse.json({ remaining: 0, limit: FREE_TTS_DAILY_LIMIT, isFree: true });
  }
}
