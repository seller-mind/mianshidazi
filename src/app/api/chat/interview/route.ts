// 面试官对话API - POST /api/chat/interview
import { NextRequest } from 'next/server';
import { chatCompletionStream, buildInterviewMessages } from '@/lib/ai/client';
import { getPersonaPrompt } from '@/lib/ai/prompts';
import type { PersonaType, TensionSignal, ChatMessage } from '@/types';

// 存储会话上下文（生产环境应该用Redis或数据库）
const sessionContexts: Map<string, {
  messages: Array<{ role: string; content: string }>;
  tensionSignals: TensionSignal[];
  persona: PersonaType;
  interviewType: string;
}> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, persona, sessionId, interviewType, resume, timestamp } = body;

    // 验证必填参数
    if (!message || !persona || !sessionId) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数: message, persona, sessionId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证人格类型
    const validPersonas: PersonaType[] = ['A', 'B', 'C', 'D', 'E'];
    if (!validPersonas.includes(persona)) {
      return new Response(
        JSON.stringify({ error: '无效的人格类型' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取或创建会话上下文
    let context = sessionContexts.get(sessionId);
    if (!context) {
      context = {
        messages: [],
        tensionSignals: [],
        persona,
        interviewType: interviewType || '通用面试',
      };
      sessionContexts.set(sessionId, context);
    }

    // 获取面试官Prompt
    const systemPrompt = getPersonaPrompt(persona, interviewType, resume);

    // 构建消息列表
    const messages = buildInterviewMessages(
      systemPrompt,
      context.messages,
      message,
      interviewType,
      resume
    );

    // 创建SSE响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          await chatCompletionStream(
            messages,
            (chunk) => {
              fullResponse += chunk;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            },
            { temperature: 0.7, maxTokens: 2000 }
          );

          // 保存对话历史
          context!.messages.push({ role: 'user', content: message });
          context!.messages.push({ role: 'assistant', content: fullResponse });

          // 计算紧张信号（简化版，基于回复长度）
          const tensionSignal: TensionSignal = {
            type: 'length',
            score: message.length < 20 ? 60 : message.length < 40 ? 30 : 0,
            value: message.length,
            threshold: 20,
            message: message.length < 20 ? '回复过短' : '正常',
          };
          context!.tensionSignals.push(tensionSignal);

          // 发送结束信号
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error('SSE流式响应错误:', error);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ error: '生成回答失败' })}\n\n`
          ));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('面试对话API错误:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 获取会话上下文（用于报告生成）
export function getSessionContext(sessionId: string) {
  return sessionContexts.get(sessionId);
}

// 清除会话上下文
export function clearSessionContext(sessionId: string) {
  sessionContexts.delete(sessionId);
}
