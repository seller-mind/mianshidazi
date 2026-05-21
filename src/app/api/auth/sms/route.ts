import { NextRequest, NextResponse } from 'next/server';

// 简单的内存验证码存储（生产环境应使用Redis）
const codeStore = new Map<string, { code: string; expires: number }>();

// 清理过期验证码
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of codeStore) {
    if (value.expires < now) codeStore.delete(key);
  }
}, 60000);

async function sendSms(phone: string, code: string): Promise<boolean> {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

  // 没配置则走开发模式
  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    console.log(`[DEV] SMS not configured, code for ${phone}: ${code}`);
    return false;
  }

  try {
    const Dysmsapi20170525 = await import('@alicloud/dysmsapi20170525');
    const OpenApi = await import('@alicloud/openapi-client');
    const Util = await import('@alicloud/tea-util');

    const config = new OpenApi.Config({
      accessKeyId,
      accessKeySecret,
    });
    config.endpoint = 'dysmsapi.aliyuncs.com';
    const client = new Dysmsapi20170525.default(config);

    const sendReq = new Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phone,
      signName,
      templateCode,
      templateParam: JSON.stringify({ code, min: '5' }),
    });

    const runtime = new Util.RuntimeOptions({});
    const result = await client.sendSmsWithOptions(sendReq, runtime);

    console.log(`[SMS] Send to ${phone}, code=${result.body?.code}, message=${result.body?.message}`);
    return result.body?.code === 'OK';
  } catch (smsError) {
    console.error('[SMS] API error:', smsError);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phone, action } = await request.json();

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: '手机号格式不正确' }, { status: 400 });
    }

    if (action === 'send') {
      // 检查频率限制：60秒内只能发一次
      const existing = codeStore.get(phone);
      if (existing && existing.expires > Date.now() - 54000) {
        return NextResponse.json({ error: '发送太频繁，请60秒后再试' }, { status: 429 });
      }

      // 生成6位验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      codeStore.set(phone, { code, expires: Date.now() + 300000 }); // 5分钟有效

      // 调用阿里云短信API发送
      const smsSuccess = await sendSms(phone, code);
      
      if (!smsSuccess) {
        // 开发环境：短信发送失败也返回成功，验证码打印在控制台
        console.log(`[DEV] Fallback - SMS code for ${phone}: ${code}`);
      }

      return NextResponse.json({ success: true, message: '验证码已发送' });

    } else if (action === 'verify') {
      // 验证验证码
      const { code } = await request.json();
      const stored = codeStore.get(phone);

      if (!stored || stored.code !== code || stored.expires < Date.now()) {
        return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 });
      }

      // 验证成功，删除验证码
      codeStore.delete(phone);

      // 查找或创建用户
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const supabase = createAdminClient();

      // 先查用户
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (!user) {
        // 创建新用户
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({ phone })
          .select()
          .single();
        if (error) {
          console.error('Create user error:', error);
          return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
        }
        user = newUser;
      }

      // 生成JWT
      const jwt = await import('jsonwebtoken');
      const token = jwt.sign(
        { userId: user.id, phone: user.phone },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, phone: user.phone, nickname: user.nickname, avatar_url: user.avatar_url },
      });

      // 设置cookie
      response.cookies.set('msd_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30天
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth SMS error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
