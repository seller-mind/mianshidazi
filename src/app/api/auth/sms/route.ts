import { NextRequest, NextResponse } from 'next/server';

// 用Map存储session token（dypns验证码验证需要）
const sessionStore = new Map<string, { sessionId: string; expires: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of sessionStore) {
    if (value.expires < now) sessionStore.delete(key);
  }
}, 60000);

async function sendSmsCode(phone: string): Promise<{ success: boolean; detail: string; sessionId?: string; code?: string }> {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;

  if (!accessKeyId || !accessKeySecret) {
    return { success: false, detail: `缺少阿里云凭证` };
  }

  try {
    const Dypnsapi = await import('@alicloud/dypnsapi20170525');
    const OpenApi = await import('@alicloud/openapi-client');
    const Util = await import('@alicloud/tea-util');

    const config = new OpenApi.Config({ accessKeyId, accessKeySecret });
    config.endpoint = 'dypnsapi.aliyuncs.com';
    const client = new Dypnsapi.default(config);

    const sendReq = new Dypnsapi.SendSmsVerifyCodeRequest({
      phoneNumber: phone,
      signName: process.env.ALIYUN_SMS_SIGN_NAME || '速通互联验证码',
      templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '100001',
      templateParam: '{"code":"##code##","min":"5"}',
      codeLength: 6,
      codeType: 1, // 纯数字
      returnVerifyCode: true, // 返回验证码明文
      validTime: 300, // 5分钟有效
      interval: 60, // 60秒间隔
    });

    const runtime = new Util.RuntimeOptions({});
    const result = await client.sendSmsVerifyCodeWithOptions(sendReq, runtime);

    const resultCode = result.body?.code;
    const resultMsg = result.body?.message;
    const sessionId = result.body?.sessionId;
    const verifyCode = (result.body as any)?.verifyCode;

    if (resultCode === 'OK') {
      return { success: true, detail: '发送成功', sessionId, code: verifyCode };
    }

    return { success: false, detail: `dypns返回: code=${resultCode}, message=${resultMsg}` };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, detail: `dypns异常: ${errMsg.substring(0, 300)}` };
  }
}

async function verifySmsCode(phone: string, code: string, sessionId: string): Promise<{ success: boolean; detail: string }> {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;

  if (!accessKeyId || !accessKeySecret) {
    return { success: false, detail: '缺少阿里云凭证' };
  }

  try {
    const Dypnsapi = await import('@alicloud/dypnsapi20170525');
    const OpenApi = await import('@alicloud/openapi-client');
    const Util = await import('@alicloud/tea-util');

    const config = new OpenApi.Config({ accessKeyId, accessKeySecret });
    config.endpoint = 'dypnsapi.aliyuncs.com';
    const client = new Dypnsapi.default(config);

    const checkReq = new Dypnsapi.CheckSmsVerifyCodeRequest({
      phoneNumber: phone,
      sessionId,
      verifyCode: code,
    });

    const runtime = new Util.RuntimeOptions({});
    const result = await client.checkSmsVerifyCodeWithOptions(checkReq, runtime);

    const resultCode = result.body?.code;
    const resultMsg = result.body?.message;

    if (resultCode === 'OK') {
      return { success: true, detail: '验证通过' };
    }

    return { success: false, detail: `验证失败: code=${resultCode}, message=${resultMsg}` };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, detail: `验证异常: ${errMsg.substring(0, 300)}` };
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
      // 60秒内不能重发
      const existing = sessionStore.get(phone);
      if (existing && existing.expires > Date.now() - 54000) {
        return NextResponse.json({ error: '发送太频繁，请60秒后再试' }, { status: 429 });
      }

      const smsResult = await sendSmsCode(phone);

      if (!smsResult.success) {
        return NextResponse.json({ error: '验证码发送失败，请稍后重试', _debug: smsResult.detail }, { status: 500 });
      }

      // 存sessionId用于后续验证
      if (smsResult.sessionId) {
        sessionStore.set(phone, { sessionId: smsResult.sessionId, expires: Date.now() + 300000 });
      }

      // 如果dypns返回了验证码明文（returnVerifyCode=true），存下来作为备用验证方式
      if (smsResult.code) {
        sessionStore.set(phone + '_code', { sessionId: smsResult.code, expires: Date.now() + 300000 });
      }

      return NextResponse.json({ success: true, message: '验证码已发送' });

    } else if (action === 'verify') {
      if (!inputCode || !/^\d{6}$/.test(inputCode)) {
        return NextResponse.json({ error: '请输入6位验证码' }, { status: 400 });
      }

      const stored = sessionStore.get(phone);

      // 方案1：用dypns的CheckSmsVerifyCode验证
      if (stored?.sessionId) {
        const verifyResult = await verifySmsCode(phone, inputCode, stored.sessionId);

        if (verifyResult.success) {
          sessionStore.delete(phone);
          // 创建/查找用户，设置cookie
          return await loginUser(phone);
        }

        // dypns验证失败，尝试本地备用验证
        const localCode = sessionStore.get(phone + '_code');
        if (localCode && localCode.sessionId === inputCode && localCode.expires > Date.now()) {
          sessionStore.delete(phone);
          sessionStore.delete(phone + '_code');
          return await loginUser(phone);
        }

        return NextResponse.json({ error: '验证码错误或已过期', _debug: verifyResult.detail }, { status: 400 });
      }

      // 方案2：本地备用验证
      const localCode = sessionStore.get(phone + '_code');
      if (localCode && localCode.sessionId === inputCode && localCode.expires > Date.now()) {
        sessionStore.delete(phone + '_code');
        return await loginUser(phone);
      }

      return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 });

    } else {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: '服务器错误', _debug: errMsg.substring(0, 200) }, { status: 500 });
  }
}

async function loginUser(phone: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 查找或创建用户
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (!user) {
    const { data: newUser, error: createErr } = await supabase
      .from('users')
      .insert({ phone, nickname: `用户${phone.slice(-4)}` })
      .select()
      .single();

    if (createErr) {
      return NextResponse.json({ error: '创建用户失败', _debug: createErr.message }, { status: 500 });
    }
    user = newUser;
  }

  // 生成JWT token
  const jwtSecret = process.env.JWT_SECRET || 'msd_jwt_secret_2026_change_in_prod';
  const { sign } = await import('jsonwebtoken');
  const token = sign(
    { userId: user.id, phone: user.phone },
    jwtSecret,
    { expiresIn: '7d' }
  );

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, phone: user.phone, nickname: user.nickname },
  });

  response.cookies.set('msd_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
