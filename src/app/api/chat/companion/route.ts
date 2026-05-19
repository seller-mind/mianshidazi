// 阿搭陪伴对话API - POST /api/chat/companion (V9版)
import { NextRequest } from 'next/server';
import { chatCompletionStream, buildCompanionMessages } from '@/lib/ai/client';
import { getCompanionPromptWithHistory } from '@/lib/ai/prompts';
import type { CompanionContext } from '@/types';

// 存储阿搭陪伴会话上下文
const companionContexts: Map<string, {
  messages: Array<{ role: string; content: string }>;
  context: string;
  startTime: number;
}> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, sessionId, history } = body;

    // 验证必填参数
    if (!message || !sessionId) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数: message, sessionId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证上下文类型
    const validContexts = ['深夜', '面试前', '面试后', '等通知', '崩溃急救', '日常'];
    const validContext = validContexts.includes(context) ? context : '日常';

    // 获取或创建会话上下文
    let companionContext = companionContexts.get(sessionId);
    if (!companionContext) {
      companionContext = {
        messages: [],
        context: validContext,
        startTime: Date.now(),
      };
      companionContexts.set(sessionId, companionContext);
    }

    // 更新上下文
    companionContext.context = validContext;

    // 如果客户端传了history，用它覆盖内存中的历史（确保一致性）
    if (history && Array.isArray(history) && history.length > 0) {
      companionContext.messages = history.filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant');
    }

    // 构建Prompt（包含历史消息）V9版
    const systemPrompt = getCompanionPromptWithHistory(validContext, companionContext.messages);

    // 简化版消息格式
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...companionContext.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

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
            { temperature: 0.8, maxTokens: 1500 }
          );

          // 保存对话历史（限制保留最近8轮）
          companionContext!.messages.push({ role: 'user', content: message });
          companionContext!.messages.push({ role: 'assistant', content: fullResponse });
          
          // 保持历史消息在合理范围内
          if (companionContext!.messages.length > 16) {
            companionContext!.messages = companionContext!.messages.slice(-16);
          }

          // 发送结束信号
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error('SSE流式响应错误:', error);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ error: '阿搭打了个盹，请再说一遍' })}\n\n`
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
    console.error('阿搭陪伴对话API错误:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 获取阿搭会话上下文
export function getCompanionContext(sessionId: string) {
  return companionContexts.get(sessionId);
}

// 清除阿搭会话上下文
export function clearCompanionContext(sessionId: string) {
  companionContexts.delete(sessionId);
}
