// TTS API - 阿里云百炼 CosyVoice
// 直接返回音频二进制，客户端创建blob播放
// 文本限制250字，确保Vercel 10秒内完成

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

function cleanText(text: string): string {
  return text
    // 去掉括号里的舞台指示（停顿2秒）（轻轻微笑）等
    .replace(/[（(][^）)]*[）)]/g, '')
    // 去emoji
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    // 去Markdown
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    // 语气词正常化
    .replace(/[～~]/g, '，')
    .replace(/哎哟[，,！!。]/g, '嗯，')
    .replace(/哎呦[，,！!。]/g, '嗯，')
    .replace(/哟[，,！!。]/g, '，')
    .replace(/嗯嗯+/g, '嗯')
    .replace(/哈哈+/g, '哈哈')
    // 换行→句号
    .replace(/\n+/g, '。')
    // 合并多余标点
    .replace(/。{2,}/g, '。')
    .replace(/，{2,}/g, '，')
    .trim();
}

function truncateText(text: string, maxLen = 250): string {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastPunc = Math.max(
    truncated.lastIndexOf('。'), truncated.lastIndexOf('，'),
    truncated.lastIndexOf('！'), truncated.lastIndexOf('？'),
    truncated.lastIndexOf('；')
  );
  if (lastPunc > maxLen * 0.4) return text.substring(0, lastPunc + 1);
  return truncated + '…';
}

export async function GET(request: NextRequest) {
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'TTS未配置' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const rawText = searchParams.get('text') || '';
  const persona = searchParams.get('persona') || 'A';
  const isCompanion = searchParams.get('isCompanion') === 'true';

  const text = truncateText(cleanText(rawText), 250);
  if (!text) {
    return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
  }

  const voice = isCompanion ? COMPANION_VOICE : (PERSONA_VOICE[persona] || PERSONA_VOICE['A']);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    // 第一步：调用CosyVoice获取音频URL
    const cosResponse = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'cosyvoice-v3-flash',
        input: { text, voice, format: 'mp3', sample_rate: 22050, rate: 1.0 },
      }),
      signal: controller.signal,
    });

    if (!cosResponse.ok) {
      console.error('CosyVoice error:', cosResponse.status);
      return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
    }

    const cosData = await cosResponse.json();
    const audioUrl = cosData?.output?.audio?.url;

    if (!audioUrl) {
      console.error('CosyVoice no URL');
      return NextResponse.json({ error: '语音合成异常' }, { status: 500 });
    }

    // 第二步：下载音频文件（服务端代理，避免客户端CORS问题）
    const httpsUrl = audioUrl.replace(/^http:/, 'https:');
    const audioResponse = await fetch(httpsUrl, { signal: controller.signal });

    if (!audioResponse.ok) {
      console.error('Audio download failed:', audioResponse.status);
      return NextResponse.json({ error: '音频下载失败' }, { status: 500 });
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    clearTimeout(timeoutId);

    // 第三步：直接返回音频二进制
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(audioBuffer.byteLength),
      },
    });

  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: '语音合成超时' }, { status: 504 });
    }
    console.error('TTS error:', error.message);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}
