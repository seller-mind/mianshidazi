import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const APP_SECRET = process.env.XUNHU_APP_SECRET || '';

function verifySign(params: Record<string, string>): boolean {
  const sign = params.sign;
  const signType = params.sign_type;
  const filtered = { ...params };
  delete filtered.sign;
  delete filtered.sign_type;

  const signStr = Object.keys(filtered)
    .sort()
    .map(key => `${key}=${filtered[key]}`)
    .join('&') + APP_SECRET;

  const calculatedSign = signType === 'HMAC-SHA256'
    ? crypto.createHmac('sha256', APP_SECRET).update(signStr).digest('hex').toLowerCase()
    : crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();

  return sign === calculatedSign;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let params: Record<string, string>;

    if (contentType.includes('application/json')) {
      params = await request.json();
    } else {
      const text = await request.text();
      params = Object.fromEntries(new URLSearchParams(text));
    }

    console.log('Payment callback received:', JSON.stringify(params));

    // 验证签名
    if (!verifySign(params)) {
      console.error('Sign verification failed');
      return NextResponse.json({ status: 'error', msg: '签名验证失败' }, { status: 400 });
    }

    // 支付成功
    if (params.trade_status === 'OD' || params.trade_status === 'TRADE_SUCCESS') {
      const orderNo = params.out_trade_no;
      const xunhuTradeNo = params.trade_no || params.transaction_id || '';

      const { createAdminClient } = await import('@/lib/supabase/admin');
      const supabase = createAdminClient();

      // 查找订单
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_no', orderNo)
        .single();

      if (orderError || !order) {
        console.error('Order not found:', orderNo);
        return NextResponse.json({ status: 'error', msg: '订单不存在' }, { status: 400 });
      }

      // 防止重复处理
      if (order.status === 'paid') {
        return NextResponse.json({ status: 'success' });
      }

      // 更新订单状态
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          xunhu_trade_no: xunhuTradeNo,
          paid_at: new Date().toISOString(),
        })
        .eq('order_no', orderNo);

      // 发放权益
      const now = new Date();
      let expiresAt: string | null = null;
      let interviewsRemaining: number | null = null;

      if (order.plan_id === 'single') {
        interviewsRemaining = 1;
        // 单次不设过期时间（或者设7天过期）
        const expireDate = new Date(now);
        expireDate.setDate(expireDate.getDate() + 7);
        expiresAt = expireDate.toISOString();
      } else if (order.plan_id === 'monthly') {
        const expireDate = new Date(now);
        expireDate.setDate(expireDate.getDate() + 30);
        expiresAt = expireDate.toISOString();
      } else if (order.plan_id === 'quarterly') {
        const expireDate = new Date(now);
        expireDate.setDate(expireDate.getDate() + 90);
        expiresAt = expireDate.toISOString();
      }

      // 先将用户之前的活跃订阅过期
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('user_id', order.user_id)
        .eq('status', 'active');

      // 创建新订阅
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: order.user_id,
          plan_id: order.plan_id,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt,
          interviews_remaining: interviewsRemaining,
        });

      if (subError) {
        console.error('Create subscription error:', subError);
      }

      console.log('Payment processed successfully:', orderNo, order.plan_id);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json({ status: 'error', msg: 'Internal error' }, { status: 500 });
  }
}

// 虎皮椒也可能用GET回调
export async function GET(request: NextRequest) {
  return POST(request);
}
