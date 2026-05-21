import { NextRequest, NextResponse } from 'next/server';

// 内存验证码存储
const codeStore = new Map<string, { code: string; expires: number }>();

// 清理过期验证码
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of codeStore) {
    if (value.expires < now) codeStore.delete(key);
  }
}, 60000);

async function sendSmsViaDypns(phone: string, code: string): Promise<boolean> {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

  if (!accessKeyId || !accessKeySecret) {
    console.log(`[DEV] SMS not configured, code for ${phone}: ${code}`);
    return false;
  }

  try {
    // 优先使用 dypns（短信认证服务，无需资质审核）
    const Dypnsapi = await import('@alicloud/dypnsapi20170525');
    const OpenApi = await import('@alicloud/openapi-client');
    const Util = await import('@alicloud/tea-util');

    const config = new OpenApi.Config({
      accessKeyId,
      accessKeySecret,
    });
    // dypns 的 endpoint
    config.endpoint = 'dypnsapi.aliyuncs.com';
    const client = new Dypnsapi.default(config);

    // 使用 SendSms 接口
    const sendReq = new Dypnsapi.SendSmsRequest({
      phoneNumber: phone,
      signName: signName || '速通互联验证码',
      templateCode: templateCode || '100001',
      templateParam: JSON.stringify({ code, min: '5' }),
    });

    const runtime = new Util.RuntimeOptions({});
    const result = await client.sendSmsWithOptions(sendReq, runtime);

    console.log(`[SMS-DYPNS] Send to ${phone}, code=${result.body?.code}, message=${result.body?.message}`);
    return result.body?.code === 'OK';
  } catch (dypnsError) {
    console.error('[SMS-DYPNS] Error, falling back to dysms:', dypnsError);

    // fallback 到 dysms
    try {
      const Dysmsapi = await import('@alicloud/dysmsapi20170525');
      const OpenApi = await import('@alicloud/openapi-client');
      const Util = await import('@alicloud/tea-util');

      const config = new OpenApi.Config({ accessKeyId, accessKeySecret });
      config.endpoint = 'dysmsapi.aliyuncs.com';
      const client = new Dysmsapi.default(config);

      const sendReq = new Dysmsapi.SendSmsRequest({
        phoneNumbers: phone,
        signName: signName || '速通互联验证码',
        templateCode: templateCode || '100001',
        templateParam: JSON.stringify({ code, min: '5' }),
      });

      const runtime = new Util.RuntimeOptions({});
      const result = await client.sendSmsWithOptions(sendReq, runtime);

      console.log(`[SMS-DYSMS] Send to ${phone}, code=${result.body?.code}, message=${result.body?.message}`);
      return result.body?.code === 'OK';
    } catch (dysmsError) {
      console.error('[SMS-DYSMS] Error:', dysmsError);
      return false;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phone, action, code: inputCode } = await request.json();

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: '手机号格式不正确' }, { status: 400 });
    }

    if (action === 'send') {
      // 频率限制
      const existing = codeStore.get(phone);
      if (existing && existing.expires > Date.now() - 54000) {
        return NextResponse.json({ error: '发送太频繁，请60秒后再试' }, { status: 429 });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      codeStore.set(phone, { code, expires: Date.now() + 300000 });

      const smsSuccess = await sendSmsViaDypns(phone, code);

      if (!smsSuccess) {
        console.log(`[DEV] Fallback - SMS code for ${phone}: ${code}`);
      }

      return NextResponse.json({ success: true, message: '验证码已发送' });

    } else if (action === 'verify') {
      if (!inputCode || !/^\d{6}$/.test(inputCode)) {
        return NextResponse.json({ error: '请输入6位验证码' }, { status: 400 });
      }

      const stored = codeStore.get(phone);
      if (!stored || stored.code !== inputCode || stored.expires < Date.now()) {
        return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 });
      }

      codeStore.delete(phone);

      // 查找或创建用户
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const supabase = createAdminClient();

      let { data: user } = await supabase.from('users').select('*').eq('phone', phone).single();

      if (!user) {
        const { data: newUser, error } = await supabase
          .from('users').insert({ phone }).select().single();
        if (error) {
          console.error('Create user error:', error);
          return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
        }
        user = newUser;
      }

      // 生成JWT
      const jwt = await import('jsonwebtoken');
      const token = jwt.sign(
        { userId: user.id, phone: user.phone, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, phone: user.phone, nickname: user.nickname },
      });

      response.cookies.set('msd_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
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
