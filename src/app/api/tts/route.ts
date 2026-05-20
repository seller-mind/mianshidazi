// TTS API - 阿里云百炼 CosyVoice
// 分段版：客户端已拆段，服务端只负责单段合成，不截断
// 节奏调优：rate=0.9 对话语速 + 标点控制停顿节奏

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

// 对话节奏参数
const COMPANION_RATE = 0.9;  // 陪伴模式：稍慢，像朋友聊天
const INTERVIEW_RATE = 0.95; // 面试模式：正常略慢，清晰沉稳

function cleanText(text: string): string {
  return text
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/[～~]/g, '，')
    // 语气词自然化
    .replace(/哎哟[，,！!。？?]/g, '是这样，')
    .replace(/哎呦[，,！!。？?]/g, '嗯，')
    .replace(/哎呀[，,！!。？?]/g, '嗯，')
    .replace(/哟[，,！!。？?]/g, '，')
    .replace(/呵[呵哈]+[，,！!。？?]/g, '，')
    .replace(/嘿[嘿哈]+[，,！!。？?]/g, '，')
    .replace(/嗯嗯+/g, '嗯')
    .replace(/哈哈+/g, '哈哈')
    .replace(/哇[哦噢]+[，,！!。？?]/g, '，')
    .replace(/呃[，,！!。？?]/g, '，')
    .replace(/额[，,！!。？?]/g, '，')
    .replace(/哦[哦噢]+[，,！!。？?]/g, '，')
    .replace(/啊[啊哈]+[，,！!。？?]/g, '，')
    .replace(/^嗯[，,]/, '')
    .replace(/^哦[，,]/, '')
    // 节奏控制：换行→分号（≈400ms停顿，自然对话节奏），而非句号（≈600ms太长）
    .replace(/\n+/g, '；')
    .replace(/；{2,}/g, '；')
    .replace(/。{2,}/g, '。')
    .replace(/，{2,}/g, '，')
    .trim();
}

export async function GET(request: NextRequest) {
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'TTS未配置' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const rawText = searchParams.get('text') || '';
  const persona = searchParams.get('persona') || 'A';
  const isCompanion = searchParams.get('isCompanion') === 'true';

  const text = cleanText(rawText);
  if (!text) {
    return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
  }

  const voice = isCompanion ? COMPANION_VOICE : (PERSONA_VOICE[persona] || PERSONA_VOICE['A']);
  const rate = isCompanion ? COMPANION_RATE : INTERVIEW_RATE;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

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
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
    }

    const data = await response.json();
    const audioUrl = data?.output?.audio?.url;

    if (!audioUrl) {
      return NextResponse.json({ error: '语音合成异常' }, { status: 500 });
    }

    return NextResponse.json({ url: audioUrl.replace(/^http:/, 'https:') });

  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: '语音合成超时' }, { status: 504 });
    }
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}
