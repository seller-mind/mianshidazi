import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

function getToken(request: NextRequest): string | null {
  let token = request.cookies.get('msd_token')?.value;
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }
  return token || null;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - list user sessions
export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const supabase = getSupabase();

    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: 'query_failed' }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch {
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }
}

// POST - create or update session
export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const body = await request.json();
    const { session_id, type, persona, title } = body;

    const supabase = getSupabase();

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .upsert({
        id: session_id,
        user_id: decoded.userId,
        type: type || 'interview',
        persona,
        title: title || (type === 'companion' ? '阿搭聊天' : '模拟面试'),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'create_failed' }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }
}
