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

// POST /api/user/avatar - upload avatar image
export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userId = decoded.userId;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'no_file' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'invalid_type', message: '仅支持 PNG/JPG/WebP/GIF 格式' }, { status: 400 });
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'file_too_large', message: '图片不能超过2MB' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Generate unique filename
    const ext = file.type.split('/')[1] || 'png';
    const filename = `${userId}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename);

    const avatarUrl = urlData.publicUrl;

    // Update user avatar_url in database
    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
      .select('id, nickname, avatar_url')
      .single();

    if (updateError || !user) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
      },
    });
  } catch (e) {
    console.error('Avatar upload error:', e);
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }
}
