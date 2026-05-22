import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

function getToken(request: NextRequest): string | null {
  let token = request.cookies.get('msd_token')?.value;
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
  }
  return token || null;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/referral/code - get user's referral code and stats
export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const referralCode = decoded.userId.substring(0, 8);

    const supabase = getSupabase();

    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', decoded.userId);

    return NextResponse.json({
      referralCode,
      referralLink: `https://www.mianshidazi.com?ref=${referralCode}`,
      referralCount: count || 0,
      reward: '每邀请1位好友注册，双方各得1次免费面试机会',
    });
  } catch {
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }
}
