// 初始化面试会话API - POST /api/session/init
import { NextRequest } from 'next/server';
import type { PersonaType, CompanionContext } from '@/types';

// 会话存储
const interviewSessions: Map<string, {
  id: string;
  type: 'interview' | 'companion';
  persona?: PersonaType;
  context?: CompanionContext;
  interviewType?: string;
  createdAt: number;
  messages: Array<{ role: string; content: string }>;
}> = new Map();

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, persona, context, interviewType } = body;

    // 验证必填参数
    if (!type) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数: type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证会话类型
    if (!['interview', 'companion'].includes(type)) {
      return new Response(
        JSON.stringify({ error: '无效的会话类型' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 生成会话ID
    const sessionId = generateSessionId();

    // 创建会话
    const session = {
      id: sessionId,
      type: type as 'interview' | 'companion',
      persona: persona as PersonaType,
      context: context as CompanionContext,
      interviewType,
      createdAt: Date.now(),
      messages: [],
    };

    interviewSessions.set(sessionId, session);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sessionId,
          createdAt: session.createdAt,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('初始化会话API错误:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 导出会话存储（供其他API使用）
export { interviewSessions };
