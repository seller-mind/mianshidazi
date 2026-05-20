// TTS API - 阿里云百炼 CosyVoice
// 核心约束：非流式API单次限制200字符（汉字算2），超出会被截断
// 客户端已按此限制分段，服务端只负责合成

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
    // 去掉所有括号内容
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[[\【][^】\]]*[】\]]/g, '')
    // 去emoji
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/✅✨👉💡🔥☕🌙😅/g, '')
    // Markdown
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/[～~]/g, '，')
    .replace(/→/g, '到')
    .replace(/—+/g, '——')
    // 语气词
    .replace(/哎哟[，,！!。？?～]/g, '是这样，')
    .replace(/哎呦[，,！!。？?～]/g, '嗯，')
    .replace(/哎呀[，,！!。？?～]/g, '嗯，')
    .replace(/哟[，,！!。？?～]/g, '，')
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
    // 节奏：换行→分号
    .replace(/\n+/g, '；')
    .replace(/；{2,}/g, '；')
    .replace(/。{2,}/g, '。')
    .replace(/，{2,}/g, '，')
    .trim();
}

// 计算CosyVoice字符数
function cosyVoiceLen(text: string): number {
  let len = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) || (code >= 0xF900 && code <= 0xFAFF)) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
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

  // 安全检查：超过200字符截断到安全位置
  let safeText = text;
  if (cosyVoiceLen(text) > 195) {
    console.warn(`[TTS API] text too long (${cosyVoiceLen(text)} chars), truncating`);
    let cutPos = 0;
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text[i].codePointAt(0)!;
      count += ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) ? 2 : 1;
      if (count > 180) { cutPos = i; break; }
    }
    // 往前找标点
    for (let i = cutPos; i >= Math.max(0, cutPos - 20); i--) {
      if ('。！？；，'.includes(text[i])) {
        safeText = text.substring(0, i + 1);
        break;
      }
    }
    if (safeText === text) safeText = text.substring(0, cutPos);
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
        input: { text: safeText, voice, format: 'mp3', sample_rate: 22050, rate },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[TTS API] synthesis failed:', response.status, errText);
      return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
    }

    const data = await response.json();
    const audioUrl = data?.output?.audio?.url;

    if (!audioUrl) {
      console.error('[TTS API] no audio url:', JSON.stringify(data));
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
