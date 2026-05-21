import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    // 查找用户
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, nickname, avatar_url, phone')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 400 });
    }

    // 验证密码
    if (!user.password_hash) {
      return NextResponse.json({ error: '该账号未设置密码，请先注册' }, { status: 400 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 400 });
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, phone: user.phone },
      process.env.JWT_SECRET!,
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
    console.error('Login error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
