import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const APP_SECRET = process.env.XUNHU_APP_SECRET || '';

function verifyHash(params: Record<string, string>): boolean {
  const receivedHash = params.hash;
  if (!receivedHash) return false;

  // 按虎皮椒文档：排除hash和空值，按ASCII码升序排列，拼接key=secret后MD5
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k === 'hash' || v === '' || v === undefined || v === null) continue;
    filtered[k] = v;
  }

  const signStr = Object.keys(filtered)
    .sort()
    .map(key => `${key}=${filtered[key]}`)
    .join('&') + APP_SECRET;

  const calculatedHash = crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();

  return receivedHash === calculatedHash;
}

async function handleCallback(params: Record<string, string>) {
  console.log('Payment callback received:', JSON.stringify(params));

  // 验证签名
  if (!verifyHash(params)) {
    console.error('Hash verification failed. Params:', JSON.stringify(params));
    return NextResponse.json({ status: 'error', msg: '签名验证失败' }, { status: 400 });
  }

  // 支付成功
  if (params.trade_status === 'OD' || params.trade_status === 'TRADE_SUCCESS') {
    // 虎皮椒回调的订单号字段是 trade_order_id（我们传过去的），也可能是 out_trade_no
    const orderNo = params.trade_order_id || params.out_trade_no;
    const xunhuTradeNo = params.trade_no || params.transaction_id || '';

    if (!orderNo) {
      console.error('No order number in callback params');
      return NextResponse.json({ status: 'error', msg: '缺少订单号' }, { status: 400 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 查找订单
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_no', orderNo)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderNo, orderError);
      return NextResponse.json({ status: 'error', msg: '订单不存在' }, { status: 400 });
    }

    // 防止重复处理
    if (order.status === 'paid') {
      console.log('Order already paid:', orderNo);
      return NextResponse.json({ status: 'success' });
    }

    // 更新订单状态
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_no: xunhuTradeNo,
      })
      .eq('order_no', orderNo);

    // 发放权益
    const now = new Date();
    let expiresAt: string | null = null;
    let interviewsRemaining: number | null = null;

    if (order.plan_id === 'single') {
      interviewsRemaining = null; // 日卡不限次数
      const expireDate = new Date(now);
      expireDate.setDate(expireDate.getDate() + 1);
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
        expires_at: expiresAt,
        interviews_remaining: interviewsRemaining,
      });

    if (subError) {
      console.error('Create subscription error:', subError);
    }

    console.log('Payment processed successfully:', orderNo, order.plan_id);
  }

  return NextResponse.json({ status: 'success' });
}

// POST回调 - 虎皮椒异步通知
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let params: Record<string, string>;

    if (contentType.includes('application/json')) {
      params = await request.json();
    } else {
      // 虎皮椒默认发form-urlencoded
      const text = await request.text();
      if (text.startsWith('{')) {
        params = JSON.parse(text);
      } else {
        params = Object.fromEntries(new URLSearchParams(text));
      }
    }

    return await handleCallback(params);
  } catch (error) {
    console.error('Payment callback POST error:', error);
    return NextResponse.json({ status: 'error', msg: 'Internal error' }, { status: 500 });
  }
}

// GET回调 - 虎皮椒同步跳转
export async function GET(request: NextRequest) {
  try {
    const params: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return await handleCallback(params);
  } catch (error) {
    console.error('Payment callback GET error:', error);
    // 支付跳转回来失败时，重定向到首页而不是显示错误
    return NextResponse.redirect(new URL('/?pay=check', request.url));
  }
}
