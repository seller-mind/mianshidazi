// 面试报告生成工具
import type { ChatMessage, TensionSignal, TensionDiagnosis, InterviewReport } from '../../types';
import { calculateTensionIndex, diagnoseTensionType } from './tension-detector';

// 阿搭寄语模板
const ADA_MESSAGES = [
  "你知道吗，愿意来练习就已经很勇敢了。不管今天回答得怎么样，这只是一次练习。真正的面试，你只会越来越好。",
  "我跟你说，我见过太多人，第一次面试紧张得要死，练了三次之后，面试就像聊天一样自然。你也会的。",
  "紧张不是你的敌人，是你的信号。它在告诉你：我很在乎这件事。有在乎，才有动力。",
  "你可能没意识到，但刚才那个回答其实很加分。面试官问你缺点的时候，你说了一个真实的、能改进的缺点，这比说「太完美主义」强一百倍。",
];

// 计算回答质量得分
function scoreAnswer(content: string, tensionSignal?: TensionSignal): number {
  let score = 70;

  if (content.length > 100) score += 5;
  if (content.length > 200) score += 5;
  if (content.includes('数据') || content.match(/\d+/)) score += 10;
  if (content.includes('结果') || content.includes('效果')) score += 5;
  if (content.includes('我') && content.includes('负责')) score += 5;

  if (tensionSignal) {
    score -= tensionSignal.score * 0.3;
  }

  if (content.length < 30) score -= 20;
  if (content.includes('不知道') || content.includes('不太清楚')) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// 提取亮点问题
function extractHighlights(
  messages: ChatMessage[],
  tensionSignals: TensionSignal[]
): Array<{ question: string; answer: string; score: number }> {
  const highlights: Array<{ question: string; answer: string; score: number }> = [];

  for (let i = 1; i < messages.length; i += 2) {
    const userMsg = messages[i];
    if (userMsg.role !== 'user') continue;

    const prevAssistantMsg = messages[i - 1];
    if (prevAssistantMsg?.role !== 'assistant') continue;

    const score = scoreAnswer(userMsg.content);
    
    if (score >= 75) {
      highlights.push({
        question: extractQuestion(prevAssistantMsg.content),
        answer: userMsg.content.slice(0, 200),
        score,
      });
    }

    if (highlights.length >= 3) break;
  }

  return highlights;
}

function extractQuestion(assistantContent: string): string {
  const cleaned = assistantContent.replace(/\n/g, ' ').trim();
  return cleaned.length > 50 ? cleaned.slice(0, 50) + '...' : cleaned;
}

function extractTensionLosses(
  messages: ChatMessage[],
  tensionSignals: TensionSignal[]
): Array<{ question: string; reason: string; lostPoints: number }> {
  const losses: Array<{ question: string; reason: string; lostPoints: number }> = [];

  for (const signal of tensionSignals) {
    if (signal.score > 40) {
      const reasonMap: Record<string, string> = {
        pause: '停顿时间过长',
        speed: '语速明显变慢',
        filler: '填充词使用过多',
        length: '回答内容过于简短',
      };

      losses.push({
        question: '该问题',
        reason: reasonMap[signal.type] || '紧张导致表现失常',
        lostPoints: Math.round(signal.score * 0.2),
      });
    }
  }

  return losses.slice(0, 3);
}

function estimateRealLevel(messages: ChatMessage[]): number {
  let totalScore = 0;
  let count = 0;

  for (const msg of messages) {
    if (msg.role === 'user') {
      const score = scoreAnswer(msg.content);
      totalScore += score;
      count++;
    }
  }

  return count > 0 ? Math.round(totalScore / count) : 50;
}

// 生成练习建议（仅限练习相关，不涉及身心训练方法）
function generateSuggestions(
  tensionDiagnosis: TensionDiagnosis,
  messageCount: number
): Array<{ priority: number; title: string; description: string }> {
  const suggestions: Array<{ priority: number; title: string; description: string }> = [];

  if (messageCount < 10) {
    suggestions.push({
      priority: 1,
      title: '多练习几轮',
      description: '面试是熟能生巧的事，建议再练习3-5次，会越来越自然',
    });
  }

  suggestions.push({
    priority: 2,
    title: '录音复盘',
    description: '回听自己的回答，你会发现自己说话的习惯和可以改进的地方',
  });

  if ((tensionDiagnosis.tensionIndex ?? 0) >= 40) {
    suggestions.push({
      priority: 3,
      title: '练习过渡句',
      description: '准备一些「争取时间」的话术，如「这个问题很有意思，让我想想」',
    });
  }

  return suggestions.slice(0, 3);
}

function selectAdaMessage(tensionIndex: number, actualScore: number): string {
  if (actualScore >= 80) {
    return "今天的表现很棒！你其实比自己想象的厉害。记住这种感觉，下次面试就按照今天的状态来。";
  }
  
  if (tensionIndex >= 60) {
    return "我懂，那种紧张到脑子一片空白的感觉真的太难受了。但你今天能来练习，已经迈出了最难的一步。你知道吗，我见过太多人，连这一步都不敢迈。";
  }

  const baseMessage = ADA_MESSAGES[Math.floor(Math.random() * ADA_MESSAGES.length)];
  return baseMessage;
}

/**
 * 生成面试报告
 */
export function generateInterviewReport(
  sessionId: string,
  messages: ChatMessage[],
  tensionSignals: TensionSignal[],
  tensionDiagnosis?: TensionDiagnosis
): InterviewReport {
  const overallIndex = tensionDiagnosis?.tensionIndex || calculateTensionIndex(tensionSignals);
  const diagnosis = tensionDiagnosis || diagnoseTensionType(overallIndex, tensionSignals);

  const actualScore = estimateRealLevel(messages);
  const tensionLoss = Math.round(overallIndex * 0.22);
  const realLevel = Math.min(100, actualScore + tensionLoss);

  const highlights = extractHighlights(messages, tensionSignals);
  const tensionLosses = extractTensionLosses(messages, tensionSignals);
  const suggestions = generateSuggestions(diagnosis, messages.length);

  const summary = `你本可以得${realLevel}分。紧张偷走了你${tensionLoss}分。`;
  const adaMessage = selectAdaMessage(overallIndex, actualScore);

  return {
    sessionId,
    summary,
    overallScore: realLevel,
    tensionIndex: overallIndex,
    scores: {
      overall: realLevel,
      actualScore,
      realLevel,
      tensionLost: tensionLoss,
    },
    highlights,
    improvements: suggestions.map(s => s.title),
    tensionLosses,
    tensionAnalysis: {
      totalSignals: tensionSignals.length,
      criticalSignals: tensionSignals.filter(s => s.score > 50).length,
      dominantType: tensionSignals.length > 0 ? tensionSignals[0].type : null,
      tips: suggestions.map(s => s.title),
    },
    tensionDiagnosis: diagnosis,
    suggestions,
    adaMessage,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 格式化报告为可读文本
 */
export function formatReportAsText(report: InterviewReport): string {
  let text = `
# 面试报告

## ${report.summary ?? '面试报告'}

## 表现分析
- 实际表现分：${report.scores?.actualScore ?? 0}
- 真实水平：${report.scores?.realLevel ?? 0}
- 紧张偷走的分数：${report.scores?.tensionLost ?? 0}

## 紧张类型测试
- 类型：${report.tensionDiagnosis?.typeName ?? '未知'}
- 紧张指数：${report.tensionDiagnosis?.tensionIndex ?? 0}
- 描述：${report.tensionDiagnosis?.description ?? ''}

## 亮点
${report.highlights.map((h, i) => `${i + 1}. ${h.question}（得分：${h.score}）`).join('\n')}

## 紧张导致的损失
${(report.tensionLosses ?? []).map((l, i) => `${i + 1}. ${l.reason}，损失约${l.lostPoints}分`).join('\n')}

## 进步建议
${(report.suggestions ?? []).map((s, i) => `${i + 1}. ${s.title}：${s.description}`).join('\n')}

## 阿搭说
${report.adaMessage}

---
报告生成时间：${report.createdAt}
`;

  return text;
}
