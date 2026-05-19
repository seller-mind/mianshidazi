// TTS API - 阿里云百炼 CosyVoice
// 返回 JSON { url, urls, error } 格式
// 短文本（<200字）: 返回单个 { url }
// 长文本（>=200字）: 返回 { urls: [...] } 多段音频URL
// 客户端 Audio 直接播放，避免服务端代理下载超时

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const TTS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';

// 音色映射
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
    // 去掉括号里的舞台指示（停顿2秒）（轻轻微笑）等
    .replace(/[（(][^）)]*[）)]/g, '')
    // 波浪号→逗号
    .replace(/[～~]/g, '，')
    // 语气词替换
    .replace(/哎哟[，,！!。]/g, '嗯，')
    .replace(/哎呦[，,！!。]/g, '嗯，')
    .replace(/哟[，,！!。]/g, '，')
    .replace(/嗯嗯+/g, '嗯')
    .replace(/哈哈+/g, '哈哈')
    .replace(/\n+/g, '。')
    .replace(/。{2,}/g, '。')
    .replace(/，{2,}/g, '，')
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

// 按标点分段，每段不超过maxChars
function splitText(text: string, maxChars = 150): string[] {
  if (text.length <= maxChars) return [text];

  const segments: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      segments.push(remaining);
      break;
    }

    // 在maxChars内找最后一个句号/问号/感叹号
    let splitPos = -1;
    for (let i = Math.min(remaining.length - 1, maxChars); i >= Math.max(0, maxChars * 0.4); i--) {
      if ('。！？；'.includes(remaining[i])) {
        splitPos = i + 1;
        break;
      }
    }

    // 没找到句号，找逗号
    if (splitPos === -1) {
      for (let i = Math.min(remaining.length - 1, maxChars); i >= Math.max(0, maxChars * 0.4); i--) {
        if ('，、'.includes(remaining[i])) {
          splitPos = i + 1;
          break;
        }
      }
    }

    // 还没找到，硬切
    if (splitPos === -1) {
      splitPos = maxChars;
    }

    segments.push(remaining.substring(0, splitPos));
    remaining = remaining.substring(splitPos);
  }

  return segments;
}

// 单段合成
async function synthesizeOne(text: string, voice: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'cosyvoice-v3-flash',
      input: { text, voice, format: 'mp3', sample_rate: 22050, rate: 1.0 },
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('CosyVoice error:', response.status, errorText.substring(0, 300));
    throw new Error(`语音合成失败: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const json = await response.json();
    const audioUrl = json?.output?.audio?.url;
    if (audioUrl) {
      return audioUrl.replace(/^http:/, 'https:');
    }
    throw new Error('语音合成未返回音频URL');
  }

  throw new Error('语音合成返回格式异常');
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

  const controller = new AbortController();
  // 总超时25秒（分段并行，Vercel Hobby实际限制约10s但并行请求可能更快）
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const segments = splitText(clean, 150);

    // 短文本：单次请求
    if (segments.length === 1) {
      const url = await synthesizeOne(segments[0], voiceConfig.voice, controller.signal);
      clearTimeout(timeoutId);
      return NextResponse.json({ url });
    }

    // 长文本：分段并行请求
    const results = await Promise.all(
      segments.map(seg => synthesizeOne(seg, voiceConfig.voice, controller.signal))
    );

    clearTimeout(timeoutId);
    return NextResponse.json({ urls: results });

  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: '语音合成超时' }, { status: 504 });
    }
    console.error('TTS synthesize error:', error.message);
    return NextResponse.json({ error: error.message || '语音合成失败' }, { status: 500 });
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
