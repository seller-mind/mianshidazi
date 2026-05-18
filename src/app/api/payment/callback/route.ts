import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const params = await request.json();
    
    console.log('Payment callback received:', params);

    // 验证签名（实际项目中需要验证）
    // const sign = params.sign;
    // delete params.sign;
    // const calculatedSign = md5(...);

    // 处理支付成功逻辑
    if (params.trade_status === 'OD' || params.trade_status === 'TRADE_SUCCESS') {
      const orderNo = params.out_trade_no;
      // 更新订单状态，发放会员权限
      console.log('Payment successful for order:', orderNo);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json(
      { status: 'error', msg: 'Internal error' },
      { status: 500 }
    );
  }
}
