// STT API - 语音转文字
// 方案：客户端录音上传 → 服务端转base64 → 调qwen3-asr-flash（兼容模式API）
// 优点：一个POST请求直接返回结果，无需上传文件/获取凭证/轮询

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

    // 音频大小限制：10MB
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '音频文件过大' }, { status: 400 });
    }

    console.log(`[STT] received audio: ${audioFile.name}, size=${audioFile.size}, type=${audioFile.type}`);

    // 读取音频并转base64
    const audioBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    // 确定MIME类型
    const mimeType = audioFile.type || 'audio/webm';
    const dataUri = `data:${mimeType};base64,${base64Audio}`;

    // 调用qwen3-asr-flash（兼容模式API，一个POST直接返回结果）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-asr-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_audio',
                  input_audio: {
                    data: dataUri,
                  },
                },
              ],
            },
          ],
          stream: false,
          extra_body: {
            asr_options: {
              enable_itn: false,
            },
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.error('[STT] API failed:', response.status, errText);
        return NextResponse.json({ error: '语音识别服务异常' }, { status: 500 });
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim() || '';

      console.log(`[STT] result: "${text}"`);

      if (!text) {
        return NextResponse.json({ error: '未识别到内容，请再说一次' }, { status: 400 });
      }

      return NextResponse.json({ text });

    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err as Error;
      if (error.name === 'AbortError') {
        return NextResponse.json({ error: '识别超时，请重试' }, { status: 504 });
      }
      throw error;
    }

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[STT] error:', error.message);
    return NextResponse.json({ error: error.message || '语音识别失败' }, { status: 500 });
  }
}
