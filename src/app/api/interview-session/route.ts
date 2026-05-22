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

// POST - 确保interview_sessions中有记录
export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const body = await request.json();
    const { session_id, persona } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('interview_sessions')
      .select('session_id')
      .eq('session_id', session_id)
      .single();

    if (!existing) {
      const { data: chatSession } = await supabase
        .from('chat_sessions')
        .select('persona, type')
        .eq('id', session_id)
        .single();

      await supabase.from('interview_sessions').insert({
        session_id,
        user_id: decoded.userId,
        type: 'interview',
        persona: persona || chatSession?.persona || 'A',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Interview Session] Error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
