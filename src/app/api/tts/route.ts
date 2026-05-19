// TTS API - 阿里云百炼 CosyVoice
// 直接返回 audio/mpeg 音频数据
// 客户端用 new Audio('/api/tts?text=...') 直接播放，不需要fetch

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const TTS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';

const PERSONA_VOICE: Record<string, { voice: string; rate: number; instruction?: string }> = {
  A: { voice: 'longanyang', rate: 1.0, instruction: '你正在进行闲聊互动，你说话的情感是happy。' },
  B: { voice: 'longanhuan', rate: 1.0, instruction: '你正在进行闲聊互动，你说话的情感是neutral。' },
  C: { voice: 'longcheng_v3', rate: 1.1 },
  D: { voice: 'longyingmu_v3', rate: 1.05 },
  E: { voice: 'longzhe_v3', rate: 0.9 },
};

const COMPANION_VOICE = { voice: 'longanrou', rate: 0.85 };

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

async function synthesize(text: string, persona?: string, isCompanion?: boolean): Promise<NextResponse> {
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'TTS API Key 未配置' }, { status: 500 });
  }

  const clean = truncateText(cleanText(text), 300);
  if (!clean) {
    return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
  }

  const voiceConfig = isCompanion ? COMPANION_VOICE : (PERSONA_VOICE[persona || 'A'] || PERSONA_VOICE['A']);

  const input: Record<string, unknown> = {
    text: clean,
    voice: voiceConfig.voice,
    format: 'mp3',
    sample_rate: 22050,
    rate: voiceConfig.rate,
  };

  if (voiceConfig.instruction) {
    input.instruction = voiceConfig.instruction;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'cosyvoice-v3-flash', input }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CosyVoice error:', response.status, errorText.substring(0, 300));
      return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
    }

    const contentType = response.headers.get('content-type') || '';

    // 直接返回音频二进制
    if (contentType.includes('audio') || contentType.includes('octet-stream')) {
      const buf = await response.arrayBuffer();
      return new NextResponse(buf, {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    // JSON响应 → 从URL下载或从base64解码
    const data = await response.json();
    const audioUrl = data.output?.audio?.url;
    const audioData = data.output?.audio?.data;

    if (audioUrl) {
      // http→https修复（mixed content）
      const httpsUrl = audioUrl.replace(/^http:\/\//, 'https://');
      const dlController = new AbortController();
      const dlTimeout = setTimeout(() => dlController.abort(), 5000);
      try {
        const audioResp = await fetch(httpsUrl, { signal: dlController.signal });
        clearTimeout(dlTimeout);
        if (audioResp.ok) {
          const buf = Buffer.from(await audioResp.arrayBuffer());
          return new NextResponse(buf, {
            headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
          });
        }
      } catch (e) {
        clearTimeout(dlTimeout);
        console.error('Audio URL download failed:', e);
      }
    }

    if (audioData) {
      const buf = Buffer.from(audioData, 'base64');
      return new NextResponse(buf, {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    console.error('CosyVoice unexpected format:', JSON.stringify(data).substring(0, 200));
    return NextResponse.json({ error: '语音合成返回格式异常' }, { status: 500 });

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: '语音合成超时' }, { status: 504 });
    }
    console.error('TTS error:', error);
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
    return await synthesize(text, persona, isCompanion);
  } catch (error) {
    console.error('TTS GET error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}
