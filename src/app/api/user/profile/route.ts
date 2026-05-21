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

// GET /api/user/profile - get user profile
export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const supabase = getSupabase();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, phone, nickname, avatar_url, free_interviews_used')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        free_interviews_used: user.free_interviews_used || 0,
      },
    });
  } catch {
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }
}

// PUT /api/user/profile - update user profile
export async function PUT(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const body = await request.json();
    const { nickname, avatar_url } = body;

    const supabase = getSupabase();
    const updates: Record<string, string> = {};
    if (nickname !== undefined) updates.nickname = nickname;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', decoded.userId)
      .select('id, phone, nickname, avatar_url')
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
      },
    });
  } catch {
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }
}
