import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '请输入正确的邮箱地址' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
    }

    // 检查环境变量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const jwtSecret = process.env.JWT_SECRET;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        error: '服务器配置缺失', 
        debug: { hasUrl: !!supabaseUrl, hasKey: !!serviceRoleKey, hasJwt: !!jwtSecret } 
      }, { status: 500 });
    }

    // 直接用supabase-js，不走admin helper
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 检查邮箱是否已注册
    const { data: existing, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = not found, 其他才是真错误
      return NextResponse.json({ 
        error: '查询用户失败', 
        debug: { code: selectError.code, message: selectError.message } 
      }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 400 });
    }

    // 加密密码
    const passwordHash = hashPassword(password);

    // 创建用户
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({ email, password_hash: passwordHash })
      .select('id, email, nickname, avatar_url')
      .single();

    if (insertError || !user) {
      return NextResponse.json({ 
        error: '创建用户失败', 
        debug: { code: insertError?.code, message: insertError?.message } 
      }, { status: 500 });
    }

    if (!jwtSecret) {
      return NextResponse.json({ 
        error: 'JWT配置缺失', 
      }, { status: 500 });
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '30d' }
    );

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, nickname: user.nickname, avatar_url: user.avatar_url },
    });

    response.cookies.set('msd_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    // 返回详细错误信息便于调试
    const errMsg = error instanceof Error ? error.message : '未知错误';
    const errStack = error instanceof Error ? error.stack : '';
    return NextResponse.json({ 
      error: '服务器错误', 
      debug: { message: errMsg, stack: errStack?.substring(0, 500) } 
    }, { status: 500 });
  }
}
