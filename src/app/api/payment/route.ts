import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const APP_ID = process.env.XUNHU_APP_ID || '';
const APP_SECRET = process.env.XUNHU_APP_SECRET || '';

const PRICE_MAP: Record<string, { price: number; name: string }> = {
  single: { price: 9.9, name: '单次模拟面试' },
  monthly: { price: 49, name: '月卡会员' },
  quarterly: { price: 119, name: '季卡会员' },
};

export async function POST(request: NextRequest) {
  try {
    // 验证登录状态
    const token = request.cookies.get('msd_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 });
    }

    const { planId } = await request.json();
    if (!planId || !PRICE_MAP[planId]) {
      return NextResponse.json({ error: '无效的套餐' }, { status: 400 });
    }

    const plan = PRICE_MAP[planId];
    const orderNo = `MSD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 写入订单到数据库
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: decoded.userId,
        order_no: orderNo,
        plan_id: planId,
        amount: plan.price,
        status: 'pending',
      });

    if (orderError) {
      console.error('Create order error:', orderError);
      return NextResponse.json({ error: '创建订单失败' }, { status: 500 });
    }

    // 虎皮椒支付参数
    const params: Record<string, string> = {
      appid: APP_ID,
      out_trade_no: orderNo,
      total_fee: (plan.price * 100).toFixed(0),
      title: `面试搭子 - ${plan.name}`,
      time: Math.floor(Date.now() / 1000).toString(),
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mianshidazi.com'}/api/payment/callback`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mianshidazi.com'}/payment/success?order=${orderNo}`,
    };

    // 生成签名
    const signStr = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&') + APP_SECRET;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();

    const paymentUrl = `https://api.xunhupay.com/payment/do.html?${Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')}&sign=${sign}&sign_type=MD5`;

    return NextResponse.json({
      success: true,
      orderNo,
      paymentUrl,
    });
  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
