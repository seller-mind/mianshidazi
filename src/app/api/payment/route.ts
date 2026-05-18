import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const APP_ID = process.env.XUNHU_APP_ID || '201906180430';
const APP_SECRET = process.env.XUNHU_APP_SECRET || '7fee12263fabb890b677b51d235ffb85';

export async function POST(request: NextRequest) {
  try {
    const { planId, userId } = await request.json();

    if (!planId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 定价映射
    const priceMap: Record<string, number> = {
      single: 9.9,
      monthly: 49,
      quarterly: 119,
    };

    const price = priceMap[planId];
    if (!price) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
    }

    // 生成订单号
    const orderNo = `MSD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 虎皮椒支付参数
    const params: Record<string, string> = {
      appid: APP_ID,
      out_trade_no: orderNo,
      total_fee: (price * 100).toFixed(0), // 转换为分
      title: `面试搭子 - ${planId === 'single' ? '单次体验' : planId === 'monthly' ? '月卡会员' : '季卡会员'}`,
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

    // 构建支付URL
    const paymentUrl = `https://api.xunhupay.com/payment/do.html?${Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}&sign=${sign}&sign_type=MD5`;

    return NextResponse.json({
      success: true,
      orderNo,
      paymentUrl,
    });
  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
