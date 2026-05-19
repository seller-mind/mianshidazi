// TTS API - 阿里云百炼 CosyVoice
// 使用 SSE 流式合成，服务端收集完音频后返回 MP3
// 客户端可配合预加载实现秒出声

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const TTS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';

// 人格 → 音色映射（均为 cosyvoice-v3-flash 兼容音色）
const PERSONA_VOICE: Record<string, { voice: string; rate: number }> = {
  A: { voice: 'longanwen_v3', rate: 0.85 },   // 优雅知性女 - 温柔鼓励
  B: { voice: 'longanlang_v3', rate: 1.0 },    // 清爽利落男 - 真实模拟
  C: { voice: 'longcheng_v3', rate: 1.1 },     // 智慧青年男 - 压力挑战
  D: { voice: 'longyingmu_v3', rate: 1.05 },   // 优雅知性女 - 犀利毒舌
  E: { voice: 'longzhe_v3', rate: 0.9 },       // 大暖男 - HR老油条
};

const COMPANION_VOICE = { voice: 'longanrou', rate: 0.85 }; // 温柔闺蜜女

function cleanText(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/\n+/g, '，')
    .trim();
}

function truncateText(text: string, maxLen = 300): string {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastPunc = Math.max(
    truncated.lastIndexOf('。'), truncated.lastIndexOf('，'),
    truncated.lastIndexOf('！'), truncated.lastIndexOf('？')
  );
  if (lastPunc > maxLen * 0.5) return text.substring(0, lastPunc + 1);
  return truncated + '…';
}

// 流式合成：用 SSE 从 CosyVoice 获取音频，服务端收集后返回完整 MP3
async function synthesizeStream(text: string, persona?: string, isCompanion?: boolean) {
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'TTS API Key 未配置' }, { status: 500 });
  }

  const clean = truncateText(cleanText(text), 300);
  if (!clean) {
    return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
  }

  const voiceConfig = isCompanion ? COMPANION_VOICE : (PERSONA_VOICE[persona || 'A'] || PERSONA_VOICE['A']);

  const body = {
    model: 'cosyvoice-v3-flash',
    input: {
      text: clean,
      voice: voiceConfig.voice,
      format: 'mp3',
      sample_rate: 22050,
      rate: voiceConfig.rate,
    },
  };

  try {
    // 使用 SSE 流式请求（首包更快）
    const response = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'enable',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CosyVoice error:', response.status, errorText.substring(0, 200));

      // SSE 流式失败，尝试非流式
      return await synthesizeNonStream(body);
    }

    // 解析 SSE，收集 base64 音频块
    const audioChunks: Buffer[] = [];
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            const audioData = data.output?.audio?.data;
            if (audioData) {
              audioChunks.push(Buffer.from(audioData, 'base64'));
            }
            // 检查是否有音频 URL（非流式返回格式）
            const audioUrl = data.output?.audio?.url;
            if (audioUrl && !audioData) {
              const audioResp = await fetch(audioUrl);
              const audioBuf = Buffer.from(await audioResp.arrayBuffer());
              return new NextResponse(audioBuf, {
                status: 200,
                headers: {
                  'Content-Type': 'audio/mpeg',
                  'Content-Length': audioBuf.byteLength.toString(),
                  'Cache-Control': 'public, max-age=86400',
                },
              });
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    if (audioChunks.length === 0) {
      // SSE 没收集到音频，尝试非流式
      return await synthesizeNonStream(body);
    }

    const combined = Buffer.concat(audioChunks);
    return new NextResponse(combined, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': combined.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('CosyVoice stream error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}

// 非流式合成（兜底）
async function synthesizeNonStream(body: Record<string, unknown>) {
  try {
    const response = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('audio') || contentType.includes('octet-stream')) {
      const audioBuffer = await response.arrayBuffer();
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    const data = await response.json();
    const audioUrl = data.output?.audio?.url;
    const audioData = data.output?.audio?.data;

    if (audioUrl) {
      const audioResp = await fetch(audioUrl);
      const audioBuf = Buffer.from(await audioResp.arrayBuffer());
      return new NextResponse(audioBuf, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuf.byteLength.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    if (audioData) {
      const audioBuf = Buffer.from(audioData, 'base64');
      return new NextResponse(audioBuf, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuf.byteLength.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    return NextResponse.json({ error: '语音合成返回格式异常' }, { status: 500 });
  } catch (error) {
    console.error('CosyVoice non-stream error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const persona = searchParams.get('persona') || undefined;
    const isCompanion = searchParams.get('isCompanion') === 'true';

    if (!text) return NextResponse.json({ error: '缺少 text 参数' }, { status: 400 });
    return await synthesizeStream(text, persona, isCompanion);
  } catch (error) {
    console.error('TTS GET error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, persona, isCompanion } = body;
    if (!text) return NextResponse.json({ error: '缺少 text 参数' }, { status: 400 });
    return await synthesizeStream(text, persona, isCompanion);
  } catch (error) {
    console.error('TTS POST error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}
