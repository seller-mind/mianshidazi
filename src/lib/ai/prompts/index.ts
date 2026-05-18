// Prompt选择器 - 根据人格类型返回对应的System Prompt

import {
  PERSONA_A_PROMPT,
  PERSONA_B_PROMPT,
  PERSONA_C_PROMPT,
  PERSONA_D_PROMPT,
  PERSONA_E_PROMPT,
} from './persona-prompts';
import { ADA_SYSTEM_PROMPT, COMPANION_CONTEXT_PROMPTS } from './ada-prompt';
import type { PersonaType } from '@/types';

export function getPersonaPrompt(persona: PersonaType, interviewType?: string, resume?: string): string {
  let prompt: string;
  
  switch (persona) {
    case 'A':
      prompt = PERSONA_A_PROMPT;
      break;
    case 'B':
      prompt = PERSONA_B_PROMPT;
      break;
    case 'C':
      prompt = PERSONA_C_PROMPT;
      break;
    case 'D':
      prompt = PERSONA_D_PROMPT;
      break;
    case 'E':
      prompt = PERSONA_E_PROMPT;
      break;
    default:
      prompt = PERSONA_B_PROMPT;
  }

  // 添加面试类型和简历上下文
  let contextPrompt = '';
  
  if (interviewType) {
    contextPrompt += `\n\n【面试类型】${interviewType}\n`;
  }
  
  if (resume) {
    contextPrompt += `\n【候选人简历】\n${resume}\n`;
  }

  return prompt + contextPrompt;
}

// 获取阿搭陪伴对话的Prompt
export function getCompanionPrompt(context: string): string {
  const contextPrompt = COMPANION_CONTEXT_PROMPTS[context] || COMPANION_CONTEXT_PROMPTS['日常'];
  return `${ADA_SYSTEM_PROMPT}\n\n【当前场景】\n${contextPrompt}`;
}

// 获取带历史消息的阿搭Prompt（用于多轮对话）
export function getCompanionPromptWithHistory(
  context: string,
  historyMessages: Array<{ role: string; content: string }>
): string {
  const systemPrompt = getCompanionPrompt(context);
  
  // 限制历史消息数量，避免token超限
  const recentMessages = historyMessages.slice(-10);
  
  const historyText = recentMessages
    .map(msg => msg.role === 'user' ? `用户：${msg.content}` : `阿搭：${msg.content}`)
    .join('\n');

  return `${systemPrompt}\n\n【对话历史】\n${historyText}\n\n【继续对话】\n请根据以上对话历史和当前场景，以阿搭的身份继续回复。`;
}
