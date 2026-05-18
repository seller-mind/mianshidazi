// 面试官对话API - POST /api/chat/interview (V9版)
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
  startTime: number;
  questionCount: number;
}> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, persona, sessionId, interviewType, resume, tensionType } = body;

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
        startTime: Date.now(),
        questionCount: 0,
      };
      sessionContexts.set(sessionId, context);
    } else {
      // 更新人格（如果切换了）
      context.persona = persona;
    }

    // 获取面试官Prompt (V9版)
    const systemPrompt = getPersonaPrompt(persona, interviewType, resume);

    // 添加紧张类型上下文
    let tensionContext = '';
    if (tensionType) {
      const typeNames: Record<string, string> = {
        A: '脑暴型紧张',
        B: '身体型紧张',
        C: '社交恐惧型紧张',
        D: '完美主义型紧张',
        E: '面试PTSD型紧张',
      };
      tensionContext = `\n\n【候选人紧张类型】${typeNames[tensionType] || '未知'}\n根据紧张类型调整你的追问方式和鼓励策略。`;
    }

    // 构建消息列表
    const messages = buildInterviewMessages(
      systemPrompt + tensionContext,
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
          context!.questionCount++;

          // 计算紧张信号（V9版：基于回复长度和内容）
          const tensionSignal: TensionSignal = {
            type: 'length',
            score: message.length < 20 ? 60 : message.length < 40 ? 30 : message.length < 100 ? 10 : 0,
            value: message.length,
            threshold: 20,
            message: message.length < 20 ? '回复过短，可能紧张了' : '正常回复',
          };
          
          // 检测填充词（紧张信号）
          const fillers = ['嗯', '啊', '这个', '那个', '就是说', '然后', '就是'];
          const fillerCount = fillers.filter(f => message.includes(f)).length;
          if (fillerCount > 3) {
            tensionSignal.score += 20;
            tensionSignal.message = '填充词使用过多，可能紧张了';
          }
          
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

// 获取会话统计数据
export function getSessionStats(sessionId: string) {
  const context = sessionContexts.get(sessionId);
  if (!context) return null;
  
  return {
    duration: Date.now() - context.startTime,
    questionCount: context.questionCount,
    messageCount: context.messages.length,
    tensionSignals: context.tensionSignals,
    persona: context.persona,
  };
}
