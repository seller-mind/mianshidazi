// Prompt选择器 - 根据人格类型返回对应的System Prompt (V9版)

import { getInterviewerSystemPrompt, PERSONA_CONFIGS } from './interviewers-v9';
import ADA_SYSTEM_V9 from './ada-v9';
import type { PersonaType } from '@/types';

// 上下文Prompt模板
export const COMPANION_CONTEXT_PROMPTS: Record<string, string> = {
  '深夜': `现在是深夜，用户可能在失眠或者在想明天的面试。
保持安静的陪伴感，不要太长篇大论，像深夜电台一样温暖。
不要推荐任何呼吸练习或放松训练。`,

  '面试前': `用户马上要去面试了，可能只有几分钟的时间。
给一些"临阵磨枪"的经验，不要说太多，说最重要的1-2个点。
不要推荐呼吸法或放松训练，不要给压力，要给信心。`,

  '面试后': `用户刚面试完，可能是兴奋、失落、或者忐忑。
先问问"感觉怎么样？"，然后根据用户的状态回应。
不要急着分析，先接情绪。
如果用户说"感觉很差"，先安慰；如果说"感觉不错"，一起开心。`,

  '等通知': `用户在等面试结果通知，焦虑期。
给一些"等待期"的心态建议。
说说这个阶段HR在做什么，降低焦虑。
给一些可以做的事情，不要干等。`,

  '崩溃急救': `用户情绪崩溃了，需要紧急安慰。
先接住情绪，不要讲道理，不要给建议。
等用户情绪稳定了，再慢慢说。
如果用户提到严重的心理困扰，温和地建议寻求专业心理咨询。`,

  '日常': `用户只是来聊聊，可能没什么特别的事。
轻松一点，随意一点，像朋友聊天。
可以分享一些小知识、小故事。
不要每次都扯到面试上。`,
};

// 获取面试官人格的System Prompt
export function getPersonaPrompt(persona: PersonaType, interviewType?: string, resume?: string): string {
  let prompt = getInterviewerSystemPrompt(persona);
  
  if (interviewType) {
    prompt += `\n\n【面试类型】${interviewType}\n`;
  }
  
  if (resume) {
    prompt += `\n【候选人简历】\n${resume}\n`;
  }

  return prompt;
}

// 获取阿搭陪伴对话的Prompt
export function getCompanionPrompt(context: string): string {
  const contextPrompt = COMPANION_CONTEXT_PROMPTS[context] || COMPANION_CONTEXT_PROMPTS['日常'];
  return `${ADA_SYSTEM_V9}\n\n【当前场景】\n${contextPrompt}`;
}

// 获取带历史消息的阿搭Prompt
export function getCompanionPromptWithHistory(
  context: string,
  historyMessages: Array<{ role: string; content: string }>
): string {
  const systemPrompt = getCompanionPrompt(context);
  const recentMessages = historyMessages.slice(-10);
  const historyText = recentMessages
    .map(msg => msg.role === 'user' ? `用户：${msg.content}` : `阿搭：${msg.content}`)
    .join('\n');

  return `${systemPrompt}\n\n【对话历史】\n${historyText}\n\n【继续对话】\n请根据以上对话历史和当前场景，以阿搭的身份继续回复。`;
}

export { PERSONA_CONFIGS };
export { ADA_SYSTEM_V9 };
