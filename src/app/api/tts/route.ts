// TTS 语音合成 API
// GET: 接受 text 查询参数，直接返回音频（适合 <audio src=""> 直接引用）
// POST: 接受 JSON body，返回音频（向后兼容）

import { NextRequest, NextResponse } from 'next/server';
import { getVoiceForPersona, getCompanionVoice } from '@/lib/tts/voice-config';
import { tts } from '@/lib/tts/edge-tts-shim';

// 服务端最大文本长度（避免 Vercel 10 秒超时）
const MAX_TEXT_LENGTH = 120;

function truncateText(text: string): string {
  const clean = text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\n+/g, '，')
    .trim();

  if (clean.length <= MAX_TEXT_LENGTH) return clean;

  // 优先在标点处截断
  const truncated = clean.substring(0, MAX_TEXT_LENGTH);
  const lastPunc = Math.max(
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('，'),
    truncated.lastIndexOf('！'),
    truncated.lastIndexOf('？'),
    truncated.lastIndexOf('；')
  );
  if (lastPunc > MAX_TEXT_LENGTH * 0.5) {
    return clean.substring(0, lastPunc + 1);
  }
  return truncated;
}

// 生成音频的核心逻辑
async function generateAudio(text: string, voice?: string, persona?: string, isCompanion?: boolean, rate?: string, pitch?: string) {
  const safeText = truncateText(text);
  if (!safeText) {
    return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
  }

  // 获取音色
  let voiceId: string;
  if (voice) {
    voiceId = voice;
  } else if (isCompanion) {
    voiceId = getCompanionVoice().voice;
  } else {
    voiceId = getVoiceForPersona(persona || 'A').voice;
  }

  const ttsOptions: { voice: string; rate?: string; pitch?: string } = { voice: voiceId };
  if (rate) ttsOptions.rate = rate;
  if (pitch) ttsOptions.pitch = pitch;

  const audioBuffer = await tts(safeText, ttsOptions);
  const uint8Array = new Uint8Array(audioBuffer);

  return new NextResponse(uint8Array, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': uint8Array.byteLength.toString(),
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

// GET 请求 - 文本通过查询参数传入，直接返回音频
// 用法: <audio src="/api/tts?text=你好&persona=A" />
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const voice = searchParams.get('voice') || undefined;
    const persona = searchParams.get('persona') || undefined;
    const isCompanion = searchParams.get('isCompanion') === 'true';
    const rate = searchParams.get('rate') || undefined;
    const pitch = searchParams.get('pitch') || undefined;

    if (!text) {
      return NextResponse.json({ error: '缺少 text 参数' }, { status: 400 });
    }

    return await generateAudio(text, voice, persona, isCompanion, rate, pitch);
  } catch (error) {
    console.error('TTS GET error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}

// POST 请求 - 向后兼容
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice, persona, isCompanion, rate, pitch } = body;

    if (!text) {
      return NextResponse.json({ error: '缺少必要参数: text' }, { status: 400 });
    }

    return await generateAudio(text, voice, persona, isCompanion, rate, pitch);
  } catch (error) {
    console.error('TTS POST error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}
