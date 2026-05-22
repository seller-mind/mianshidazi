// 面试报告生成API v2 - 调用大模型生成高质量个性化报告
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const API_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

interface ChatMsg {
  role: string;
  content: string;
}


function getToken(request: NextRequest): string | null {
  let token = request.cookies.get('msd_token')?.value;
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }
  return token || null;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function saveReportToDB(userId: string, sessionId: string | undefined, report: any) {
  try {
    const supabase = getSupabase();
    if (sessionId) {
      const { data: existingSession } = await supabase
        .from('interview_sessions')
        .select('session_id')
        .eq('session_id', sessionId)
        .single();
      if (!existingSession) {
        const { data: chatSession } = await supabase
          .from('chat_sessions')
          .select('persona, type')
          .eq('id', sessionId)
          .single();
        await supabase.from('interview_sessions').insert({
          session_id: sessionId,
          user_id: userId,
          type: 'interview',
          persona: chatSession?.persona || report.tensionDiagnosis?.type || 'A',
        });
      }
    }
    const reportRow: Record<string, any> = {
      session_id: sessionId || null,
      user_id: userId,
      report_data: report,
      summary: report.summary || null,
      actual_score: report.overallScore ?? report.scores?.actualScore ?? null,
      real_level: report.realLevel ?? report.scores?.realLevel ?? null,
      tension_lost: report.tensionLost ?? report.scores?.tensionLost ?? null,
      highlights: report.highlights || null,
      tension_losses: report.tensionLosses || null,
      tension_diagnosis: report.tensionDiagnosis || null,
      suggestions: report.suggestions || null,
      ada_message: report.adaMessage || null,
    };
    const { error } = await supabase
      .from('interview_reports')
      .upsert(reportRow, { onConflict: 'session_id' });
    if (error) {
      console.error('[Report] Save to DB failed:', error);
    } else {
      console.log('[Report] Saved to DB, session_id:', sessionId);
    }
  } catch (err) {
    console.error('[Report] Save to DB error:', err);
  }
}
const REPORT_SYSTEM_PROMPT = `你是一位资深的面试教练，你要为用户生成一份面试练习报告。

你的分析必须：
1. 基于用户的实际回答内容，给出具体的、有针对性的评价
2. 切中用户心理——理解面试紧张者的感受，用他们能听懂的话说
3. 不要泛泛而谈，每一条建议都要让用户觉得"说的就是我"
4. 语气温暖但不虚伪，直接但不当头棒喝
5. 用具体的语言，不要用"建议加强""有待提高"这种空话

你必须严格按以下JSON格式输出，不要输出任何其他内容：
{
  "summary": "一句话总结，格式：你本可以得XX分，紧张偷走了你XX分。但你的真实水平远不止于此。",
  "overallScore": 数字(0-100，面试表现分，综合考虑内容质量和表达),
  "realLevel": 数字(0-100，用户真实水平估算，排除紧张因素),
  "tensionLost": 数字(紧张导致的分数损失),
  "highlights": [
    {"question": "面试官问了什么", "answer": "用户回答的摘要", "score": 数字, "comment": "为什么这段回答好"}
  ],
  "weaknesses": [
    {"question": "面试官问了什么", "answer": "用户回答的摘要", "issue": "具体问题在哪", "suggestion": "怎么改进，给具体话术示例"}
  ],
  "tensionAnalysis": {
    "level": "高/中/低",
    "signs": ["从对话中观察到的紧张表现1", "紧张表现2"],
    "impact": "紧张对这次面试的具体影响"
  },
  "suggestions": [
    {"title": "建议标题(6字以内)", "description": "具体怎么做，包含话术示例或具体行动步骤", "priority": 数字1-3}
  ],
  "adaMessage": "阿搭的私人寄语，像朋友一样说话，要真诚有温度，引用对话中的具体细节，让用户感觉被看见"
}

分析要点：
- 仔细看用户每个回答的内容深度、逻辑结构、数据支撑
- 回答太短（<30字）通常是紧张或准备不足的表现
- 回答中有具体数据、结果、STAR法则的是加分项
- 注意用户是否答非所问、是否回避问题
- 紧张信号：回答过短、反复修改、填充词多、逻辑跳跃
- 如果对话轮次很少(1-3轮)，说明用户可能紧张到不敢说话，要特别温和`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, sessionId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '缺少对话数据' }, { status: 400 });
    }

    // 构建对话摘要
    const conversationText = messages
      .map((m: ChatMsg) => `${m.role === 'user' ? '用户' : '面试官'}：${m.content}`)
      .join('\n\n');

    const userPrompt = `以下是用户的一次模拟面试对话记录，请分析并生成报告：

${conversationText}

请严格按JSON格式输出报告。`;

    // 调用qwen-plus生成报告（降成本，qwen-max作为fallback）
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [
          { role: 'system', content: REPORT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Report] API error:', response.status, errText);
      // fallback到qwen-max
      return await generateWithFallback(messages, conversationText);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[Report] No content in response');
      return await generateWithFallback(messages, conversationText);
    }

    // 解析JSON - 处理可能的markdown包裹
    let report;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      report = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[Report] JSON parse error:', parseErr);
      console.error('[Report] Raw content:', content.substring(0, 500));
      return await generateWithFallback(messages, conversationText);
    }

    // 补全必要字段
    report.scores = {
      overall: report.overallScore ?? 60,
      actualScore: report.overallScore ?? 60,
      realLevel: report.realLevel ?? 75,
      tensionLost: report.tensionLost ?? 15,
    };
    report.tensionIndex = report.tensionLost ? Math.round(report.tensionLost / 0.22) : 30;
    report.createdAt = new Date().toISOString();

    // 紧张诊断
    report.tensionDiagnosis = {
      type: 'A',
      typeName: report.tensionAnalysis?.level === '高' ? '高压型紧张' : '脑暴型紧张',
      description: report.tensionAnalysis?.impact || '紧张影响了你的正常发挥',
      tensionIndex: report.tensionIndex,
      suggestions: (report.suggestions || []).map((s: {title: string}) => s.title),
    };

    const token = getToken(request);
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        await saveReportToDB(decoded.userId, sessionId, report);
      } catch {
        // Token验证失败，仍然返回报告但不保存
      }
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('[Report] Error:', error);
    return NextResponse.json({ error: '报告生成失败' }, { status: 500 });
  }
}

// fallback用qwen-max
async function generateWithFallback(messages: ChatMsg[], conversationText: string) {
  try {
    const userPrompt = `以下是用户的一次模拟面试对话记录，请分析并生成报告：\n\n${conversationText}\n\n请严格按JSON格式输出报告。`;

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen-max',
        messages: [
          { role: 'system', content: REPORT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: '报告生成失败' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: '报告生成失败' }, { status: 500 });
    }

    let report;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      report = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: '报告解析失败' }, { status: 500 });
    }

    report.scores = {
      overall: report.overallScore ?? 60,
      actualScore: report.overallScore ?? 60,
      realLevel: report.realLevel ?? 75,
      tensionLost: report.tensionLost ?? 15,
    };
    report.tensionIndex = report.tensionLost ? Math.round(report.tensionLost / 0.22) : 30;
    report.createdAt = new Date().toISOString();
    report.tensionDiagnosis = {
      type: 'A',
      typeName: '脑暴型紧张',
      description: report.tensionAnalysis?.impact || '紧张影响了你的正常发挥',
      tensionIndex: report.tensionIndex,
      suggestions: (report.suggestions || []).map((s: {title: string}) => s.title),
    };

    return NextResponse.json({ success: true, data: report });
  } catch {
    return NextResponse.json({ error: '报告生成失败' }, { status: 500 });
  }
}
