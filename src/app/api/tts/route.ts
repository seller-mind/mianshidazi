// TTS 语音合成 API
// 使用阿里云百炼 CosyVoice（高质量神经网络语音）
// GET: 文本通过查询参数传入，返回音频
// POST: JSON body，返回音频

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const TTS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';

// 人格音色映射（cosyvoice-v3-flash 音色）
const PERSONA_VOICE: Record<string, { voice: string; rate: number; instruction?: string }> = {
  // 温柔鼓励型 - 龙颜 温暖春风女
  A: { voice: 'longyan_v3', rate: 0.9, instruction: '你说话的情感是happy。' },
  // 真实模拟型 - 龙橙 智慧青年男
  B: { voice: 'longcheng_v3', rate: 1.0 },
  // 压力挑战型 - 龙小诚 磁性低音男
  C: { voice: 'longxiaocheng_v2', rate: 1.1 },
  // 犀利毒舌型 - 龙婉 积极知性女
  D: { voice: 'longwan_v2', rate: 1.05 },
  // HR老油条型 - 龙泽 温暖元气男
  E: { voice: 'longze_v2', rate: 0.9 },
};

// 陪伴模式 - 龙安柔 温柔闺蜜女
const COMPANION_VOICE = { voice: 'longanrou', rate: 0.9, instruction: '你正在进行闲聊对话，你说话的情感是happy。' };

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
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('，'),
    truncated.lastIndexOf('！'),
    truncated.lastIndexOf('？')
  );
  if (lastPunc > maxLen * 0.5) return text.substring(0, lastPunc + 1);
  return truncated + '…';
}

async function synthesize(text: string, persona?: string, isCompanion?: boolean) {
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'TTS API Key 未配置' }, { status: 500 });
  }

  const clean = truncateText(cleanText(text), 300);
  if (!clean) {
    return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
  }

  const voiceConfig = isCompanion ? COMPANION_VOICE : (PERSONA_VOICE[persona || 'A'] || PERSONA_VOICE['A']);

  const body: Record<string, unknown> = {
    model: 'cosyvoice-v3-flash',
    input: {
      text: clean,
      voice: voiceConfig.voice,
      format: 'mp3',
      sample_rate: 22050,
      rate: voiceConfig.rate,
    },
  };

  // 添加 Instruct 指令（如果音色支持）
  if (voiceConfig.instruction) {
    body.input = {
      ...body.input as object,
      instruction: voiceConfig.instruction,
    };
  }

  try {
    const response = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CosyVoice API error:', response.status, errorText);
      return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
    }

    // 检查返回类型 - CosyVoice 可能返回 JSON 或音频流
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('audio') || contentType.includes('octet-stream')) {
      // 直接返回音频
      const audioBuffer = await response.arrayBuffer();
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 如果返回 JSON，提取音频 URL 或 base64
    const data = await response.json();
    if (data.output?.audio) {
      // base64 编码的音频
      const audioBuffer = Buffer.from(data.output.audio, 'base64');
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    if (data.output?.audio_url) {
      // 返回音频 URL，需要代理下载
      const audioResp = await fetch(data.output.audio_url);
      const audioBuffer = await audioResp.arrayBuffer();
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    console.error('Unexpected CosyVoice response:', JSON.stringify(data).substring(0, 500));
    return NextResponse.json({ error: '语音合成返回格式异常' }, { status: 500 });
  } catch (error) {
    console.error('CosyVoice API error:', error);
    return NextResponse.json({ error: '语音合成服务异常' }, { status: 500 });
  }
}

// GET - 文本通过查询参数传入
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const persona = searchParams.get('persona') || undefined;
    const isCompanion = searchParams.get('isCompanion') === 'true';

    if (!text) {
      return NextResponse.json({ error: '缺少 text 参数' }, { status: 400 });
    }

    return await synthesize(text, persona, isCompanion);
  } catch (error) {
    console.error('TTS GET error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}

// POST - JSON body
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, persona, isCompanion } = body;

    if (!text) {
      return NextResponse.json({ error: '缺少必要参数: text' }, { status: 400 });
    }

    return await synthesize(text, persona, isCompanion);
  } catch (error) {
    console.error('TTS POST error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}
