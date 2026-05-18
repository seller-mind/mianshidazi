// TTS 语音合成 API - POST /api/tts
// 使用阿里云百炼 DashScope CosyVoice API

import { NextRequest, NextResponse } from 'next/server';
import { getVoiceForPersona, getCompanionVoice } from '@/lib/tts/voice-config';

// DashScope API 配置
const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/generation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice, persona, isCompanion } = body;

    // 验证必填参数
    if (!text) {
      return NextResponse.json(
        { error: '缺少必要参数: text' },
        { status: 400 }
      );
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

    // 获取 API Key
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      console.error('DASHSCOPE_API_KEY is not configured');
      return NextResponse.json(
        { error: 'TTS 服务未配置，请联系管理员' },
        { status: 500 }
      );
    }

    // 调用 DashScope API
    const response = await fetch(DASHSCOPE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'cosyvoice-v3-flash',
        input: {
          text: text,
        },
        parameters: {
          voice: voiceId,
          format: 'mp3',
          sample_rate: 22050,
          volume: 50,
          rate: 1,
          pitch: 1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DashScope API error:', response.status, errorText);
      
      // 检查是否是配额问题
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'TTS 配额已用尽，请稍后再试' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: 'TTS 服务调用失败，请稍后重试' },
        { status: response.status }
      );
    }

    // 获取音频数据
    const audioBuffer = await response.arrayBuffer();

    // 返回音频流
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
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
