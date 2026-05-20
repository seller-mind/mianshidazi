import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=wechat_failed', request.url));
    }

    // 用code换取access_token和openid
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;

    const tokenRes = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.openid) {
      console.error('WeChat auth failed:', tokenData);
      return NextResponse.redirect(new URL('/login?error=wechat_failed', request.url));
    }

    // 获取用户信息
    const userInfoRes = await fetch(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}`
    );
    const wechatUser = await userInfoRes.json();

    // 查找或创建用户
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('wechat_openid', tokenData.openid)
      .single();

    if (!user) {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          wechat_openid: tokenData.openid,
          nickname: wechatUser.nickname || '微信用户',
          avatar_url: wechatUser.headimgurl || null,
        })
        .select()
        .single();
      if (error) {
        console.error('Create user error:', error);
        return NextResponse.redirect(new URL('/login?error=create_failed', request.url));
      }
      user = newUser;
    } else {
      // 更新微信信息
      await supabase
        .from('users')
        .update({
          nickname: wechatUser.nickname || user.nickname,
          avatar_url: wechatUser.headimgurl || user.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    // 生成JWT
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, wechat_openid: user.wechat_openid },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    // 重定向到首页，设置cookie
    const response = NextResponse.redirect(new URL('/?login=success', request.url));
    response.cookies.set('msd_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('WeChat callback error:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
