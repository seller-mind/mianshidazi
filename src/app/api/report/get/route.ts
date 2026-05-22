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

// GET - 获取面试报告
export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 });
    }

    const sessionId = request.nextUrl.searchParams.get('session_id');
    const supabase = getSupabase();

    if (sessionId) {
      const { data: report, error } = await supabase
        .from('interview_reports')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', decoded.userId)
        .single();

      if (error || !report) {
        return NextResponse.json({ report: null });
      }

      return NextResponse.json({ report });
    }

    const { data: reports, error } = await supabase
      .from('interview_reports')
      .select('id, session_id, summary, actual_score, real_level, tension_lost, created_at')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ reports: [] });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error) {
    console.error('[Report Get] Error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
