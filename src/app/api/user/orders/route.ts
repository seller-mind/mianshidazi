import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    let token: string | undefined = request.cookies.get('msd_token')?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
    }
    if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ error: '登录过期' }, { status: 401 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_no, plan_id, amount, status, created_at')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ orders: [] });

    return NextResponse.json({ orders: data });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}
