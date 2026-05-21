import { NextRequest, NextResponse } from 'next/server';

const codeStore = new Map<string, { code: string; expires: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of codeStore) {
    if (value.expires < now) codeStore.delete(key);
  }
}, 60000);

async function sendSmsViaDypns(phone: string, code: string): Promise<{ success: boolean; detail: string }> {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;

  if (!accessKeyId || !accessKeySecret) {
    return { success: false, detail: `缺少阿里云凭证: id=${!!accessKeyId}, secret=${!!accessKeySecret}` };
  }

  try {
    const Dypnsapi = await import('@alicloud/dypnsapi20170525');
    const OpenApi = await import('@alicloud/openapi-client');
    const Util = await import('@alicloud/tea-util');

    const config = new OpenApi.Config({ accessKeyId, accessKeySecret });
    config.endpoint = 'dypnsapi.aliyuncs.com';
    const client = new Dypnsapi.default(config);

    const sendReq = new Dypnsapi.SendSmsRequest({
      phoneNumber: phone,
      signName: process.env.ALIYUN_SMS_SIGN_NAME || '速通互联验证码',
      templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '100001',
      templateParam: JSON.stringify({ code, min: '5' }),
    });

    const runtime = new Util.RuntimeOptions({});
    const result = await client.sendSmsWithOptions(sendReq, runtime);

    const resultCode = result.body?.code;
    const resultMsg = result.body?.message;

    if (resultCode === 'OK') {
      return { success: true, detail: '发送成功' };
    }

    return { success: false, detail: `dypns返回: code=${resultCode}, message=${resultMsg}` };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, detail: `dypns异常: ${errMsg.substring(0, 200)}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, action, code: inputCode } = body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: '手机号格式不正确' }, { status: 400 });
    }

    if (action === 'send') {
      const existing = codeStore.get(phone);
      if (existing && existing.expires > Date.now() - 54000) {
        return NextResponse.json({ error: '发送太频繁，请60秒后再试' }, { status: 429 });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      codeStore.set(phone, { code, expires: Date.now() + 300000 });

      const smsResult = await sendSmsViaDypns(phone, code);

      if (!smsResult.success) {
        console.log(`[SMS] 发送失败: ${smsResult.detail}, 验证码: ${code}`);
        // 即使短信没发出去也存验证码，方便调试
        return NextResponse.json({
          success: true,
          message: '验证码已发送',
          _debug: smsResult.detail,
          _code: process.env.NODE_ENV === 'development' ? code : undefined,
        });
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
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const jwtSecret = process.env.JWT_SECRET;

      if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
        return NextResponse.json({
          error: '服务器配置缺失',
          debug: { hasUrl: !!supabaseUrl, hasKey: !!serviceRoleKey, hasJwt: !!jwtSecret },
        }, { status: 500 });
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      let { data: user, error: userError } = await supabase
        .from('users').select('*').eq('phone', phone).single();

      if (!user) {
        const { data: newUser, error: insertError } = await supabase
          .from('users').insert({ phone }).select().single();

        if (insertError || !newUser) {
          return NextResponse.json({
            error: '创建用户失败',
            debug: { code: insertError?.code, message: insertError?.message },
          }, { status: 500 });
        }
        user = newUser;
      }

      const jwt = await import('jsonwebtoken');
      const token = jwt.sign(
        { userId: user.id, phone: user.phone, email: user.email },
        jwtSecret,
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
    const errMsg = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: '服务器错误', debug: errMsg }, { status: 500 });
  }
}
