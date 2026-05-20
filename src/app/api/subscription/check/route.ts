import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('msd_token')?.value;
    if (!token) {
      return NextResponse.json({ canPractice: false, reason: 'not_logged_in' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ canPractice: false, reason: 'token_expired' });
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ canPractice: false, reason: 'no_subscription' });
    }

    const sub = subscriptions[0];
    const now = new Date();

    // 检查是否过期
    if (sub.expires_at && new Date(sub.expires_at) < now) {
      // 标记过期
      await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id);
      return NextResponse.json({ canPractice: false, reason: 'subscription_expired' });
    }

    // 检查单次剩余次数
    if (sub.plan_id === 'single' && sub.interviews_remaining !== null && sub.interviews_remaining <= 0) {
      await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id);
      return NextResponse.json({ canPractice: false, reason: 'interviews_used_up' });
    }

    return NextResponse.json({
      canPractice: true,
      plan: sub.plan_id,
      expiresAt: sub.expires_at,
      interviewsRemaining: sub.interviews_remaining,
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json({ canPractice: false, reason: 'server_error' });
  }
}

// 扣减面试次数（面试开始时调用）
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('msd_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!sub) {
      return NextResponse.json({ error: '无有效订阅' }, { status: 403 });
    }

    // 单次套餐扣次数
    if (sub.plan_id === 'single' && sub.interviews_remaining !== null) {
      if (sub.interviews_remaining <= 0) {
        await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id);
        return NextResponse.json({ error: '面试次数已用完' }, { status: 403 });
      }
      await supabase
        .from('subscriptions')
        .update({ interviews_remaining: sub.interviews_remaining - 1 })
        .eq('id', sub.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Consume interview error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
