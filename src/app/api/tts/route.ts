// TTS API - 阿里云百炼 CosyVoice
// 使用非流式合成，返回音频URL给客户端直接播放
// 方案：服务端调用CosyVoice获取24小时有效的音频URL，客户端直接播放该URL

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const TTS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';

// 人格 → 音色映射（cosyvoice-v3-flash）
// 支持Instruct的音色：longanyang, longanhuan（仅有这两个）
// 不支持Instruct的音色：longcheng_v3, longyingmu_v3, longzhe_v3, longanrou

interface VoiceConfig {
  voice: string;
  rate: number;
  instruction?: string; // Instruct功能，仅部分音色支持
  emotion?: string; // Instruct情感值
}

// 支持Instruct的音色配置
const PERSONA_VOICE_WITH_INSTRUCT: Record<string, VoiceConfig> = {
  A: { 
    voice: 'longanyang', 
    rate: 1.0, 
    instruction: '你正在进行闲聊互动，你说话的情感是happy。'
  },
  B: { 
    voice: 'longanhuan', 
    rate: 1.0, 
    instruction: '你正在进行闲聊互动，你说话的情感是neutral。'
  },
};

// 不支持Instruct的音色配置
const PERSONA_VOICE_NO_INSTRUCT: Record<string, VoiceConfig> = {
  C: { voice: 'longcheng_v3', rate: 1.1 },
  D: { voice: 'longyingmu_v3', rate: 1.05 },
  E: { voice: 'longzhe_v3', rate: 0.9 },
};

const COMPANION_VOICE: VoiceConfig = { voice: 'longanrou', rate: 0.85 };

function cleanText(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // 表情
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // 符号图形
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // 交通工具
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // 国旗
    .replace(/[\u{2702}-\u{27B0}]/gu, '')   // 其他符号
    .replace(/\*\*/g, '')                   // Markdown粗体
    .replace(/#{1,6}\s/g, '')               // Markdown标题
    .replace(/[「」『』]/g, '')              // 中文引号
    .replace(/\n+/g, '，')                  // 换行转逗号
    .trim();
}

function truncateText(text: string, maxLen = 300): string {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastPunc = Math.max(
    truncated.lastIndexOf('。'), truncated.lastIndexOf('，'),
    truncated.lastIndexOf('！'), truncated.lastIndexOf('？')
  );
  if (lastPunc > maxLen * 0.5) return text.substring(0, lastPunc + 1);
  return truncated + '…';
}

// 非流式合成 - 直接返回音频URL或base64数据
async function synthesizeNonStream(
  text: string, 
  persona?: string, 
  isCompanion?: boolean
): Promise<NextResponse> {
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'TTS API Key 未配置' }, { status: 500 });
  }

  const clean = truncateText(cleanText(text), 300);
  if (!clean) {
    return NextResponse.json({ error: '没有可朗读的内容' }, { status: 400 });
  }

  // 获取音色配置
  let voiceConfig: VoiceConfig;
  if (isCompanion) {
    voiceConfig = COMPANION_VOICE;
  } else if (PERSONA_VOICE_WITH_INSTRUCT[persona || 'A']) {
    voiceConfig = PERSONA_VOICE_WITH_INSTRUCT[persona || 'A'];
  } else {
    voiceConfig = PERSONA_VOICE_NO_INSTRUCT[persona || 'A'] || PERSONA_VOICE_NO_INSTRUCT['C'];
  }

  // 构建请求体
  const requestBody: Record<string, unknown> = {
    model: 'cosyvoice-v3-flash',
    input: {
      text: clean,
      voice: voiceConfig.voice,
      format: 'mp3',
      sample_rate: 22050,
      rate: voiceConfig.rate,
    },
  };

  // 如果支持Instruct，添加instruction字段
  if (voiceConfig.instruction) {
    (requestBody.input as Record<string, unknown>).instruction = voiceConfig.instruction;
  }

  try {
    // 使用 AbortController 设置 8 秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
        // 注意：非流式请求，不加 X-DashScope-SSE 头
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CosyVoice API error:', response.status, errorText.substring(0, 500));
      return NextResponse.json({ 
        error: `CosyVoice API 错误: ${response.status}`,
        detail: errorText.substring(0, 200)
      }, { status: 500 });
    }

    const contentType = response.headers.get('content-type') || '';

    // 情况1: 直接返回音频二进制
    if (contentType.includes('audio') || contentType.includes('octet-stream')) {
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

    // 情况2: 返回 JSON（包含 URL 或 base64）
    const data = await response.json();
    
    // 优先返回音频 URL（24小时有效）
    const audioUrl = data.output?.audio?.url;
    if (audioUrl) {
      return NextResponse.json({ url: audioUrl });
    }

    // 备选：返回 base64 音频数据
    const audioData = data.output?.audio?.data;
    if (audioData) {
      const audioBuffer = Buffer.from(audioData, 'base64');
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    console.error('CosyVoice 返回格式异常:', JSON.stringify(data).substring(0, 200));
    return NextResponse.json({ error: '语音合成返回格式异常' }, { status: 500 });

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('CosyVoice 请求超时');
      return NextResponse.json({ error: '语音合成超时' }, { status: 504 });
    }
    console.error('CosyVoice synthesis error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const persona = searchParams.get('persona') || undefined;
    const isCompanion = searchParams.get('isCompanion') === 'true';

    if (!text) {
      return NextResponse.json({ error: '缺少 text 参数' }, { status: 400 });
    }

    return await synthesizeNonStream(text, persona, isCompanion);
  } catch (error) {
    console.error('TTS GET error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, persona, isCompanion } = body;

    if (!text) {
      return NextResponse.json({ error: '缺少 text 参数' }, { status: 400 });
    }

    return await synthesizeNonStream(text, persona, isCompanion);
  } catch (error) {
    console.error('TTS POST error:', error);
    return NextResponse.json({ error: '语音合成失败' }, { status: 500 });
  }
}
