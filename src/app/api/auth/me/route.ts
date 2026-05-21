import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('msd_token')?.value;

    if (!token) {
      return NextResponse.json({ user: null, subscriptions: [] });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email?: string;
      phone?: string;
    };

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    // 查用户
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, phone, nickname, avatar_url')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ user: null, subscriptions: [] });
    }

    // 查订阅
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
      },
      subscriptions: subs || [],
    });
  } catch {
    return NextResponse.json({ user: null, subscriptions: [] });
  }
}
