import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('msd_token')?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, phone, nickname, avatar_url, created_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // 同时获取用户订阅状态
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      user,
      subscriptions: subscriptions || [],
    });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
