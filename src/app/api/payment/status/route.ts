import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const orderNo = request.nextUrl.searchParams.get('order');
    if (!orderNo) {
      return NextResponse.json({ error: '缺少订单号' }, { status: 400 });
    }

    // 验证登录
    let token: string | undefined = request.cookies.get('msd_token')?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ error: '登录过期' }, { status: 401 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: order, error } = await supabase
      .from('orders')
      .select('status, plan_id, order_no')
      .eq('order_no', orderNo)
      .eq('user_id', decoded.userId)
      .single();

    if (error || !order) {
      return NextResponse.json({ status: 'not_found' });
    }

    // 如果订单已支付，也检查订阅是否已创建（兜底）
    if (order.status === 'paid') {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', decoded.userId)
        .eq('status', 'active')
        .limit(1);

      // 订单paid但没订阅，补创建
      if (!subs || subs.length === 0) {
        const now = new Date();
        let expiresAt: string | null = null;
        let interviewsRemaining: number | null = null;

        if (order.plan_id === 'single') {
          interviewsRemaining = 1;
          const d = new Date(now);
          d.setDate(d.getDate() + 7);
          expiresAt = d.toISOString();
        } else if (order.plan_id === 'monthly') {
          const d = new Date(now);
          d.setDate(d.getDate() + 30);
          expiresAt = d.toISOString();
        } else if (order.plan_id === 'quarterly') {
          const d = new Date(now);
          d.setDate(d.getDate() + 90);
          expiresAt = d.toISOString();
        }

        // 过期旧订阅
        await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('user_id', decoded.userId)
          .eq('status', 'active');

        await supabase.from('subscriptions').insert({
          user_id: decoded.userId,
          plan_id: order.plan_id,
          status: 'active',
          expires_at: expiresAt,
          interviews_remaining: interviewsRemaining,
        });
      }
    }

    return NextResponse.json({
      status: order.status,
      plan_id: order.plan_id,
      order_no: order.order_no,
    });
  } catch (error) {
    console.error('Order status check error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
