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

// GET - get messages for a session
export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) return NextResponse.json({ error: 'missing_session_id' }, { status: 400 });

    const supabase = getSupabase();

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', decoded.userId)
      .single();

    if (!session) return NextResponse.json({ error: 'session_not_found' }, { status: 404 });

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'query_failed' }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch {
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }
}

// POST - save a batch of messages
export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const body = await request.json();
    const { session_id, messages } = body;

    if (!session_id || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'missing_params' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', decoded.userId)
      .single();

    if (!session) return NextResponse.json({ error: 'session_not_found' }, { status: 404 });

    // Insert messages (skip duplicates by checking id)
    const rows = messages.map((m: { id?: string; role: string; content: string; is_voice?: boolean }) => ({
      id: m.id || undefined,
      session_id,
      role: m.role,
      content: m.content,
      is_voice: m.is_voice || false,
    }));

    const { error } = await supabase
      .from('chat_messages')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('[ChatMessages] Save error:', error);
      return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    }

    // Update session timestamp
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', session_id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }
}
