// TTS API - 阿里云百炼 CosyVoice
// 返回 JSON { url, error } 格式
// 客户端拿到音频URL后 Audio 直接播放，避免服务端代理下载超时

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const TTS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';

// 音色映射 - 全部用v3音色，rate统一1.0
const PERSONA_VOICE: Record<string, { voice: string }> = {
  A: { voice: 'longanwen_v3' },
  B: { voice: 'longanlang_v3' },
  C: { voice: 'longcheng_v3' },
  D: { voice: 'longyingmu_v3' },
  E: { voice: 'longzhe_v3' },
};

const COMPANION_VOICE = { voice: 'longxiaochun_v3' };

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
    .replace(/\n+/g, '。')
    .trim();
}

function truncateText(text: string, maxLen = 800): string {
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

  const clean = truncateText(cleanText(text), 800);
  if (!clean) {
    return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
  }

  const voiceConfig = isCompanion ? COMPANION_VOICE : (PERSONA_VOICE[persona || 'A'] || PERSONA_VOICE['A']);

  const input: Record<string, unknown> = {
    text: clean,
    voice: voiceConfig.voice,
    format: 'mp3',
    sample_rate: 22050,
    rate: 1.0,
  };

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
      console.error('CosyVoice error:', response.status, errorText.substring(0, 500));
      return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
    }

    const contentType = response.headers.get('content-type') || '';

    // 情况1：CosyVoice返回JSON（含音频URL）
    if (contentType.includes('application/json')) {
      const json = await response.json();
      const audioUrl = json?.output?.audio?.url;
      if (audioUrl) {
        // http → https（避免Mixed Content）
        const httpsUrl = audioUrl.replace(/^http:/, 'https:');
        return NextResponse.json({ url: httpsUrl });
      }
      // JSON里没有URL = 错误
      console.error('CosyVoice JSON no URL:', JSON.stringify(json).substring(0, 500));
      return NextResponse.json({ error: '语音合成返回异常' }, { status: 500 });
    }

    // 情况2：直接返回音频二进制（罕见，兜底）
    if (contentType.includes('audio') || contentType.includes('octet-stream')) {
      const buf = await response.arrayBuffer();
      return new NextResponse(buf, {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    // 情况3：其他
    const text = await response.text();
    console.error('CosyVoice unexpected:', contentType, text.substring(0, 300));
    return NextResponse.json({ error: '语音合成返回异常' }, { status: 500 });

  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    if (error.name === 'AbortError') {
      console.error('CosyVoice timeout');
      return NextResponse.json({ error: '语音合成超时' }, { status: 504 });
    }
    console.error('CosyVoice fetch error:', error.message);
    return NextResponse.json({ error: '语音合成请求失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || '';
  const persona = searchParams.get('persona') || 'A';
  const isCompanion = searchParams.get('isCompanion') === 'true';

  return synthesize(text, persona, isCompanion);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, persona, isCompanion } = body;
    return synthesize(text, persona, isCompanion);
  } catch {
    return NextResponse.json({ error: '无效的请求' }, { status: 400 });
  }
}
