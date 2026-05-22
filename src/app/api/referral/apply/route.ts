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

// POST /api/referral/apply - apply referral code after registration
export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { code } = await request.json();

    if (!code) return NextResponse.json({ error: 'no_code' }, { status: 400 });

    const supabase = getSupabase();

    // Find referrer by code (first 8 chars of their user ID)
    const { data: referrers, error: findError } = await supabase
      .from('users')
      .select('id')
      .ilike('id', `${code}%`)
      .limit(1);

    if (findError || !referrers || referrers.length === 0) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    const referrerId = referrers[0].id;

    // Can't refer yourself
    if (referrerId === decoded.userId) {
      return NextResponse.json({ error: 'self_referral' }, { status: 400 });
    }

    // Check if this user already has a referrer
    const { data: currentUser } = await supabase
      .from('users')
      .select('referred_by, free_interviews_used')
      .eq('id', decoded.userId)
      .single();

    if (!currentUser) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    if (currentUser.referred_by) return NextResponse.json({ error: 'already_referred' }, { status: 400 });

    // Apply referral: set referred_by and give bonus
    // Bonus: reduce free_interviews_used by 1 (effectively gives +1 free interview)
    const newFreeUsed = Math.max(0, (currentUser.free_interviews_used || 0) - 1);

    const { error: updateError } = await supabase
      .from('users')
      .update({ referred_by: referrerId, free_interviews_used: newFreeUsed })
      .eq('id', decoded.userId);

    if (updateError) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    // Give referrer bonus too: reduce their free_interviews_used by 1
    const { data: referrerUser } = await supabase
      .from('users')
      .select('free_interviews_used')
      .eq('id', referrerId)
      .single();

    if (referrerUser) {
      const referrerNewUsed = Math.max(0, (referrerUser.free_interviews_used || 0) - 1);
      await supabase
        .from('users')
        .update({ free_interviews_used: referrerNewUsed })
        .eq('id', referrerId);
    }

    return NextResponse.json({
      success: true,
      message: '邀请码使用成功！你和邀请人都获得1次免费面试机会',
    });
  } catch {
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }
}
