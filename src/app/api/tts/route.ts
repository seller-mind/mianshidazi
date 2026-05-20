// TTS API - 阿里云百炼 CosyVoice
// 新方案：接收完整文本，服务端分段+并行合成，一次返回所有音频URL
// 客户端只需一个请求就能拿到全部音频，顺序播放即可

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

// 计算CosyVoice字符数（汉字算2）
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

// 分段：每段≤190 CosyVoice字符
function splitIntoSegments(text: string): string[] {
  if (cosyVoiceLen(text) <= 190) return [text];

  const segments: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (cosyVoiceLen(remaining) <= 190) {
      segments.push(remaining);
      break;
    }

    let splitPos = -1;
    let charCount = 0;

    for (let i = 0; i < remaining.length; i++) {
      const code = remaining[i].codePointAt(0)!;
      charCount += ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) ? 2 : 1;

      if (charCount > 170) {
        for (let j = i; j >= Math.max(0, i - 30); j--) {
          if ('。！？；'.includes(remaining[j])) { splitPos = j + 1; break; }
        }
        if (splitPos === -1) {
          for (let j = i; j >= Math.max(0, i - 30); j--) {
            if ('，、：'.includes(remaining[j])) { splitPos = j + 1; break; }
          }
        }
        if (splitPos === -1) splitPos = i;
        break;
      }
    }

    if (splitPos <= 0) splitPos = remaining.length;
    segments.push(remaining.substring(0, splitPos));
    remaining = remaining.substring(splitPos);
  }

  return segments;
}

// 合成单段音频
async function synthesizeSegment(text: string, voice: string, rate: number): Promise<string | null> {
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
        input: { text, voice, format: 'mp3', sample_rate: 22050, rate },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[TTS] segment synthesis failed:', response.status);
      return null;
    }

    const data = await response.json();
    const audioUrl = data?.output?.audio?.url;

    if (!audioUrl) {
      console.error('[TTS] no audio url in response');
      return null;
    }

    return audioUrl.replace(/^http:/, 'https:');
  } catch (err) {
    clearTimeout(timeoutId);
    const error = err as Error;
    if (error.name === 'AbortError') {
      console.error('[TTS] segment timeout');
    } else {
      console.error('[TTS] segment error:', error.message);
    }
    return null;
  }
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

  // 分段
  const segments = splitIntoSegments(text);
  console.log(`[TTS] ${segments.length} segments, total ${cosyVoiceLen(text)} chars`);

  // 并行合成所有段
  const results = await Promise.all(
    segments.map((seg, i) => synthesizeSegment(seg, voice, rate).then(url => {
      console.log(`[TTS] seg${i}: ${url ? 'OK' : 'FAILED'}`);
      return url;
    }))
  );

  // 过滤掉失败的段，但保留顺序
  const urls = results.filter((u): u is string => u !== null);

  if (urls.length === 0) {
    return NextResponse.json({ error: '语音合成全部失败' }, { status: 500 });
  }

  console.log(`[TTS] done: ${urls.length}/${segments.length} OK`);

  return NextResponse.json({ urls });
}
