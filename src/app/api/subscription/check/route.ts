import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

function getToken(request: NextRequest): string | null {
  let token = request.cookies.get('msd_token')?.value;
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
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
      return NextResponse.json({ canPractice: false, reason: 'not_logged_in' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ canPractice: false, reason: 'token_expired' });
    }

    const supabase = getSupabase();

    // 查用户信息（含free_interviews_used）
    const { data: user } = await supabase
      .from('users')
      .select('id, free_interviews_used')
      .eq('id', decoded.userId)
      .single();

    // 查有效订阅
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (subscriptions && subscriptions.length > 0) {
      const sub = subscriptions[0];
      const now = new Date();

      if (sub.expires_at && new Date(sub.expires_at) < now) {
        await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id);
      } else {
        return NextResponse.json({
          canPractice: true,
          plan: sub.plan_id,
          expiresAt: sub.expires_at,
          interviewsRemaining: sub.interviews_remaining,
          source: 'subscription',
        });
      }
    }

    // 没有有效订阅 - 检查免费次数
    const freeUsed = user?.free_interviews_used || 0;
    if (freeUsed < 1) {
      return NextResponse.json({
        canPractice: true,
        plan: 'free',
        interviewsRemaining: 1 - freeUsed,
        source: 'free_trial',
      });
    }

    return NextResponse.json({ canPractice: false, reason: 'no_subscription', source: 'none' });
  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json({ canPractice: false, reason: 'server_error' });
  }
}

// POST - 消耗面试次数
export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const supabase = getSupabase();

    // 先查订阅
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sub) {
      const now = new Date();
      if (sub.expires_at && new Date(sub.expires_at) < now) {
        await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id);
      } else {
        // 日卡/月卡/季卡都在有效期内，不限次数
        return NextResponse.json({ success: true, source: 'subscription' });
      }
    }

    // 没有订阅 - 扣免费次数
    const { data: user } = await supabase
      .from('users')
      .select('free_interviews_used')
      .eq('id', decoded.userId)
      .single();

    const freeUsed = user?.free_interviews_used || 0;
    if (freeUsed >= 1) {
      return NextResponse.json({ error: '免费次数已用完' }, { status: 403 });
    }

    await supabase
      .from('users')
      .update({ free_interviews_used: freeUsed + 1 })
      .eq('id', decoded.userId);

    return NextResponse.json({ success: true, source: 'free_trial' });
  } catch (error) {
    console.error('Consume interview error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
