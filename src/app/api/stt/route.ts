// STT API - 语音转文字
// 接收客户端上传的音频文件，调用阿里云Paraformer识别
// 支持 webm/wav/pcm 格式

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const ASR_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/paraformer';

export async function POST(request: NextRequest) {
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'STT未配置' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: '没有音频文件' }, { status: 400 });
    }

    // 读取音频为base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // 确定格式
    const mimeType = audioFile.type || 'audio/webm';
    let format = 'wav';
    if (mimeType.includes('webm')) format = 'webm';
    else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) format = 'mp3';
    else if (mimeType.includes('ogg')) format = 'ogg';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // 调用Paraformer识别
    const response = await fetch(ASR_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'paraformer-v2',
        input: {
          audio: base64Audio,
          format,
          sample_rate: 16000,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error('Paraformer error:', response.status, errText.substring(0, 300));
      return NextResponse.json({ error: '语音识别失败' }, { status: 500 });
    }

    const result = await response.json();
    const text = result?.output?.results?.[0]?.transcription?.text || 
                 result?.output?.sentence?.text || '';

    if (!text) {
      console.error('Paraformer empty result:', JSON.stringify(result).substring(0, 300));
      return NextResponse.json({ error: '未识别到语音内容' }, { status: 400 });
    }

    return NextResponse.json({ text });

  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: '语音识别超时' }, { status: 504 });
    }
    console.error('STT error:', error.message);
    return NextResponse.json({ error: '语音识别失败' }, { status: 500 });
  }
}
