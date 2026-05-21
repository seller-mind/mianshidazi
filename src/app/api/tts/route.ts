// TTS API v2 - 流式代理音频
// 优化：直接代理阿里云音频流给前端，省掉前端二次下载URL的延迟
// 预加载时仍返回URL（方便Audio元素预缓冲），点击播放时可直接用缓存

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const TTS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';

const PERSONA_VOICE: Record<string, string> = {
  A: 'longanwen_v3',
  B: 'longanlang_v3',
  C: 'longcheng_v3',
  D: 'longyingmu_v3',
  E: 'longzhe_v3',
};
const COMPANION_VOICE = 'longxiaochun_v3';
const COMPANION_RATE = 0.9;
const INTERVIEW_RATE = 0.95;

function cleanText(text: string): string {
  return text
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[[\【][^】\]]*[】\]]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/✅✨👉💡🔥☕😅🌙/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/[～~]/g, '，')
    .replace(/→/g, '到')
    .replace(/—+/g, '——')
    .replace(/\n+/g, '；')
    .replace(/；{2,}/g, '；')
    .replace(/。{2,}/g, '。')
    .replace(/，{2,}/g, '，')
    .trim();
}

// 调用阿里云TTS获取音频URL
async function getAudioUrl(text: string, persona: string, isCompanion: boolean): Promise<string | null> {
  if (!DASHSCOPE_API_KEY) return null;

  const voice = isCompanion ? COMPANION_VOICE : (PERSONA_VOICE[persona] || PERSONA_VOICE['A']);
  const rate = isCompanion ? COMPANION_RATE : INTERVIEW_RATE;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'cosyvoice-v3-flash',
        input: { text, voice, format: 'mp3', sample_rate: 22050, rate },
        parameters: { stream: true }, // stream模式更快返回
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[TTS] failed:', response.status);
      return null;
    }

    const data = await response.json();
    const audioUrl = data?.output?.audio?.url;
    return audioUrl ? audioUrl.replace(/^http:/, 'https:') : null;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[TTS] error:', (err as Error).message);
    return null;
  }
}

// POST: 返回音频URL（用于预加载）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text || '';
    const persona = body.persona || 'A';
    const isCompanion = body.isCompanion === true;

    const cleaned = cleanText(text);
    if (!cleaned) {
      return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
    }

    const audioUrl = await getAudioUrl(cleaned, persona, isCompanion);
    if (!audioUrl) {
      return NextResponse.json({ error: '合成失败' }, { status: 500 });
    }

    return NextResponse.json({ url: audioUrl });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}

// GET: 直接代理音频流（用于即时播放，省掉前端二次下载）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || '';
  const persona = searchParams.get('persona') || 'A';
  const isCompanion = searchParams.get('isCompanion') === 'true';

  const cleaned = cleanText(text);
  if (!cleaned) {
    return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
  }

  const audioUrl = await getAudioUrl(cleaned, persona, isCompanion);
  if (!audioUrl) {
    return NextResponse.json({ error: '合成失败' }, { status: 500 });
  }

  // 代理音频流
  try {
    const audioResponse = await fetch(audioUrl, {
      headers: { 'Accept': 'audio/mpeg' },
    });

    if (!audioResponse.ok) {
      return NextResponse.json({ error: '音频下载失败' }, { status: 500 });
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // 缓存1小时
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: '音频代理失败' }, { status: 500 });
  }
}
