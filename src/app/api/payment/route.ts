import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const APP_ID = process.env.XUNHU_APP_ID || '';
const APP_SECRET = process.env.XUNHU_APP_SECRET || '';
const BASE_URL = 'https://www.mianshidazi.com';

const PRICE_MAP: Record<string, { price: number; name: string }> = {
  single: { price: 9.9, name: '单次模拟面试' },
  monthly: { price: 39, name: '月卡会员' },
  quarterly: { price: 99, name: '季卡会员' },
};

export async function POST(request: NextRequest) {
  try {
    // 验证登录状态 - 同时支持cookie和Authorization header
    let token: string | undefined = request.cookies.get('msd_token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    let decoded: { userId: string };
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
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: decoded.userId,
        order_no: orderNo,
        plan_id: planId,
        amount: plan.price,
        status: 'pending',
        title: `面试搭子 - ${plan.name}`,
      });

    if (orderError) {
      console.error('Create order error:', orderError);
      return NextResponse.json({ error: '创建订单失败' }, { status: 500 });
    }

    // 虎皮椒支付参数 - 按官方API文档
    // https://www.xunhupay.com/doc/api/pay.html
    const params: Record<string, string> = {
      version: '1.1',
      appid: APP_ID,
      trade_order_id: orderNo,
      total_fee: plan.price.toString(),
      title: `面试搭子-${plan.name}`,
      time: Math.floor(Date.now() / 1000).toString(),
      notify_url: `${BASE_URL}/api/payment/callback`,
      return_url: `${BASE_URL}/payment/success?order=${orderNo}`,
      nonce_str: crypto.randomBytes(8).toString('hex'),
    };

    // 生成hash签名：按参数名ASCII码升序排列，空值不参与，拼接key=secret
    const signStr = Object.keys(params)
      .filter(key => params[key] !== '' && params[key] !== undefined)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&') + APP_SECRET;
    
    const hash = crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();

    // 使用POST方式调用虎皮椒API，服务端代理请求
    const formData = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      formData.append(k, v);
    }
    formData.append('hash', hash);

    const xunhuRes = await fetch('https://api.xunhupay.com/payment/do.html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const xunhuData = await xunhuRes.json();

    if (xunhuData.errcode !== 0) {
      console.error('XunhuPay error:', xunhuData);
      return NextResponse.json({ 
        error: `支付创建失败: ${xunhuData.errmsg || '未知错误'}` 
      }, { status: 500 });
    }

    // 虎皮椒返回支付URL，跳转用户到该URL
    const paymentUrl = xunhuData.url || xunhuData.url_qrcode;

    if (!paymentUrl) {
      console.error('No payment URL in xunhu response:', xunhuData);
      return NextResponse.json({ error: '支付链接获取失败' }, { status: 500 });
    }

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
