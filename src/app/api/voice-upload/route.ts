// 语音文件上传 - 返回临时可播放URL
// 语音消息需要可播放的URL，这里直接把blob转成Data URL返回

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: '没有音频文件' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || 'audio/webm';
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '音频文件过大' }, { status: 400 });
    }

    return NextResponse.json({ url: dataUrl });
  } catch (err) {
    console.error('[voice-upload] error:', err);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
