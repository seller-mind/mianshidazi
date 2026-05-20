// TTS API - 单段合成
// 支持GET和POST，POST避免URL长度限制问题
// 返回: { url: "https://..." }

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

async function handleRequest(text: string, persona: string, isCompanion: boolean) {
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'TTS未配置' }, { status: 500 });
  }

  const cleaned = cleanText(text);
  if (!cleaned) {
    return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
  }

  const voice = isCompanion ? COMPANION_VOICE : (PERSONA_VOICE[persona] || PERSONA_VOICE['A']);
  const rate = isCompanion ? COMPANION_RATE : INTERVIEW_RATE;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'cosyvoice-v3-flash',
        input: { text: cleaned, voice, format: 'mp3', sample_rate: 22050, rate },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[TTS] failed:', response.status, errText);
      return NextResponse.json({ error: '合成失败' }, { status: 500 });
    }

    const data = await response.json();
    const audioUrl = data?.output?.audio?.url;

    if (!audioUrl) {
      console.error('[TTS] no url:', JSON.stringify(data));
      return NextResponse.json({ error: '合成异常' }, { status: 500 });
    }

    return NextResponse.json({ url: audioUrl.replace(/^http:/, 'https:') });
  } catch (err) {
    clearTimeout(timeoutId);
    const error = err as Error;
    console.error('[TTS] error:', error.message);
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: '合成超时' }, { status: 504 });
    }
    return NextResponse.json({ error: '合成失败' }, { status: 500 });
  }
}

// GET: text/persona/isCompanion 从 query params
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || '';
  const persona = searchParams.get('persona') || 'A';
  const isCompanion = searchParams.get('isCompanion') === 'true';
  return handleRequest(text, persona, isCompanion);
}

// POST: text/persona/isCompanion 从 body（避免URL长度限制）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text || '';
    const persona = body.persona || 'A';
    const isCompanion = body.isCompanion === true;
    return handleRequest(text, persona, isCompanion);
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
