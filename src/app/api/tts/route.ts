// TTS 语音合成 API - POST /api/tts
// 使用微软 Edge TTS (完全免费)

import { NextRequest, NextResponse } from 'next/server';
import { getVoiceForPersona, getCompanionVoice } from '@/lib/tts/voice-config';
import { tts, getVoices } from '@/lib/tts/edge-tts-shim';

// GET 请求 - 返回可用音色列表
export async function GET() {
  try {
    const voices = await getVoices();
    // 过滤出中文音色
    const chineseVoices = voices.filter((v: { Locale: string }) => v.Locale.startsWith('zh-'));
    return NextResponse.json({
      success: true,
      voices: chineseVoices,
    });
  } catch (error) {
    console.error('Failed to get voices:', error);
    return NextResponse.json(
      { error: '获取音色列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice, persona, isCompanion, rate, pitch } = body;

    // 验证必填参数
    if (!text) {
      return NextResponse.json(
        { error: '缺少必要参数: text' },
        { status: 400 }
      );
    }

    // 获取音色 - 优先使用指定的 voice 参数，其次根据 persona/companion 选择
    let voiceId: string;
    if (voice) {
      voiceId = voice;
    } else if (isCompanion) {
      voiceId = getCompanionVoice().voice;
    } else {
      voiceId = getVoiceForPersona(persona || 'A').voice;
    }

    // 构建 tts 选项
    const ttsOptions: { voice: string; rate?: string; pitch?: string } = {
      voice: voiceId,
    };

    // 添加语速和音调调整（可选参数）
    if (rate) {
      ttsOptions.rate = rate;
    }
    if (pitch) {
      ttsOptions.pitch = pitch;
    }

    // 调用 edge-tts 生成音频 (返回 Node.js Buffer)
    const audioBuffer = await tts(text, ttsOptions);
    
    // 将 Node.js Buffer 转换为 Uint8Array 以供 NextResponse 使用
    const uint8Array = new Uint8Array(audioBuffer);

    // 返回音频流
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': uint8Array.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'TTS 服务发生错误，请稍后重试' },
      { status: 500 }
    );
  }
}
