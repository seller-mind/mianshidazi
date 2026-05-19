// STT API - 语音转文字
// 使用阿里云百炼 SenseVoice 实时语音识别
// 客户端上传音频文件 → 服务端调用WebSocket API识别
// 
// 注意：由于DashScope的Paraformer非实时API需要URL而非base64，
// 且WebSocket API不适合在Vercel serverless中使用，
// 这里改用OpenAI兼容的 /v1/audio/transcriptions 接口
// （DashScope支持OpenAI兼容模式）

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

export async function POST(request: NextRequest) {
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'STT未配置' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile || audioFile.size < 500) {
      return NextResponse.json({ error: '音频太短' }, { status: 400 });
    }

    // 用OpenAI兼容接口调SenseVoice
    // https://dashscope.aliyuncs.com/compatible-mode/v1/audio/transcriptions
    const sttFormData = new FormData();
    sttFormData.append('file', audioFile, audioFile.name || 'recording.webm');
    sttFormData.append('model', 'sensevoice-v1');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        },
        body: sttFormData,
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error('STT error:', response.status, errText.substring(0, 300));
      return NextResponse.json({ error: '语音识别失败' }, { status: 500 });
    }

    const result = await response.json();
    const text = result?.text || '';

    if (!text) {
      return NextResponse.json({ error: '未识别到内容' }, { status: 400 });
    }

    return NextResponse.json({ text });

  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: '识别超时' }, { status: 504 });
    }
    console.error('STT error:', error.message);
    return NextResponse.json({ error: '语音识别失败' }, { status: 500 });
  }
}
