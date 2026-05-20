import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const appId = process.env.WECHAT_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: 'WeChat login not configured' }, { status: 500 });
  }

  const redirectUri = encodeURIComponent(
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://mianshidazi.com'}/api/auth/wechat/callback`
  );
  const state = Math.random().toString(36).substring(2, 15);

  // 微信网页授权URL（扫码登录模式）
  const wechatUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;

  return NextResponse.redirect(wechatUrl);
}
