import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // 优先从cookie取，其次从Authorization header取
    let token = request.cookies.get('msd_token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return NextResponse.json({ user: null, subscriptions: [] });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email?: string;
      phone?: string;
    };

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ user: null, subscriptions: [] });
  }
}
