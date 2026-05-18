// 面试报告生成API - POST /api/report/generate
import { NextRequest } from 'next/server';
import { generateInterviewReport } from '@/lib/ai/report-generator';
import { calculateTensionIndex, diagnoseTensionType } from '@/lib/ai/tension-detector';
import type { TensionSignal, ChatMessage } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, messages, tensionData, tensionDiagnosis } = body;

    // 验证必填参数
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数: sessionId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 如果没有传入messages，尝试从请求中获取
    const chatMessages: ChatMessage[] = messages || [];

    // 紧张信号
    const signals: TensionSignal[] = tensionData || [];

    // 生成报告
    const report = generateInterviewReport(
      sessionId,
      chatMessages,
      signals,
      tensionDiagnosis
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: report,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('报告生成API错误:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
