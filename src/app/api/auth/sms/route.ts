import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function generateRandomNickname(): string {
  const adjectives = ["勇敢的", "机智的", "沉稳的", "自信的", "温暖的", "专注的", "从容的", "淡定的", "坚韧的", "灵动的"];
  const nouns = ["求职者", "追梦人", "奋斗者", "挑战者", "前行者", "探索者", "攀登者", "实践者", "破局者", "行动派"];
  const num = Math.floor(Math.random() * 9000 + 1000);
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${num}`;
}

function generateDefaultAvatar(): string {
  const colors = ["FF6B35", "4F46E5", "059669", "DC2626", "7C3AED", "0891B2", "CA8A04", "BE185D"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#${color}"/><text x="50" y="62" text-anchor="middle" font-size="45" fill="white" font-family="sans-serif">😊</text></svg>`)}`;
}

async function sendSmsCode(phone: string): Promise<{ success: boolean; detail: string; sessionId?: string; code?: string }> {
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

    const sendReq = new Dypnsapi.SendSmsVerifyCodeRequest({
      phoneNumber: phone,
      signName: process.env.ALIYUN_SMS_SIGN_NAME || '速通互联验证码',
      templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '100001',
      templateParam: '{"code":"##code##","min":"5"}',
      codeLength: 6,
      codeType: 1,
      returnVerifyCode: true,
      validTime: 300,
      interval: 60,
    });

    const runtime = new Util.RuntimeOptions({});
    const result = await client.sendSmsVerifyCodeWithOptions(sendReq, runtime);

    const body = result.body as any;
    const resultCode = body?.code;
    const resultMsg = body?.message;
    // model里有: bizId, requestId, verifyCode
    const model = body?.model || {};
    const sessionId = model.requestId || model.bizId || '';
    const verifyCode = model.verifyCode || '';

    if (resultCode === 'OK') {
      return { success: true, detail: '发送成功', sessionId, code: verifyCode };
    }

    return { success: false, detail: `dypns返回: code=${resultCode}, message=${resultMsg}` };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, detail: `dypns异常: ${errMsg.substring(0, 300)}` };
  }
}

async function verifySmsCodeViaApi(phone: string, code: string, sessionId: string): Promise<{ success: boolean; detail: string }> {
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
    const verifyResult = (result.body as any)?.model?.verifyResult;

    if (resultCode === 'OK' && verifyResult === 'PASS') {
      return { success: true, detail: '验证通过' };
    }

    return { success: false, detail: `验证失败: code=${resultCode}, verifyResult=${verifyResult}` };
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
      const supabase = getSupabase();

      // 检查60秒内是否已发过
      const { data: recent } = await supabase
        .from('sms_codes')
        .select('created_at')
        .eq('phone', phone)
        .gte('created_at', new Date(Date.now() - 60000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (recent && recent.length > 0) {
        return NextResponse.json({ error: '发送太频繁，请60秒后再试' }, { status: 429 });
      }

      // 调阿里云发短信
      const smsResult = await sendSmsCode(phone);

      if (!smsResult.success) {
        return NextResponse.json({ error: '验证码发送失败，请稍后重试', _debug: smsResult.detail }, { status: 500 });
      }

      // 存到Supabase
      const { error: insertErr } = await supabase
        .from('sms_codes')
        .insert({
          phone,
          code: smsResult.code || '',
          session_id: smsResult.sessionId || '',
          expires_at: new Date(Date.now() + 300000).toISOString(),
        });

      if (insertErr) {
        console.error('[SMS] 存储验证码失败:', insertErr);
        // 短信已发出，不阻拦
      }

      // 清理过期的验证码
      await supabase.from('sms_codes').delete().lt('expires_at', new Date().toISOString());

      return NextResponse.json({ success: true, message: '验证码已发送' });

    } else if (action === 'verify') {
      if (!inputCode || !/^\d{6}$/.test(inputCode)) {
        return NextResponse.json({ error: '请输入6位验证码' }, { status: 400 });
      }

      const supabase = getSupabase();

      // 从Supabase查验证码记录
      const { data: records } = await supabase
        .from('sms_codes')
        .select('*')
        .eq('phone', phone)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (!records || records.length === 0) {
        return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 });
      }

      const record = records[0];

      // 方案1：用dypns的CheckSmsVerifyCode验证（有sessionId时）
      if (record.session_id) {
        const verifyResult = await verifySmsCodeViaApi(phone, inputCode, record.session_id);

        if (verifyResult.success) {
          await supabase.from('sms_codes').delete().eq('id', record.id);
          return await loginUser(phone);
        }

        // dypns验证失败，尝试本地比対
        if (record.code && record.code === inputCode) {
          await supabase.from('sms_codes').delete().eq('id', record.id);
          return await loginUser(phone);
        }

        return NextResponse.json({ error: '验证码错误', _debug: verifyResult.detail }, { status: 400 });
      }

      // 方案2：本地比對验证码
      if (record.code && record.code === inputCode) {
        await supabase.from('sms_codes').delete().eq('id', record.id);
        return await loginUser(phone);
      }

      return NextResponse.json({ error: '验证码错误' }, { status: 400 });

    } else {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: '服务器错误', _debug: errMsg.substring(0, 200) }, { status: 500 });
  }
}

async function loginUser(phone: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 查找或创建用户
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (!user) {
    const { data: newUser, error: createErr } = await supabase
      .from('users')
      .insert({ phone, nickname: generateRandomNickname(), avatar_url: generateDefaultAvatar(), referred_by: body.ref || null })
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
    { expiresIn: '30d' }
  );

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, phone: user.phone, nickname: user.nickname, avatar_url: user.avatar_url },
    token, // 同时返回token给前端存localStorage
  });

  response.cookies.set('msd_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return response;
}
