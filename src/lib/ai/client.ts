// 豆包 Doubao API 客户端
import type { DoubaoResponse } from '../../types';

const API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL_ID = 'ep-20260515144642-96m6k';

// 从环境变量获取API Key，如果没有则使用默认值（仅用于开发）
const API_KEY = process.env.DASHSCOPE_API_KEY || 'sk-dc2a943892cf4f329907824f00d3bbed';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallback {
  (chunk: string): void;
}

export interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onStream?: StreamCallback;
}

/**
 * 同步调用豆包API（非流式）
 */
export async function chatCompletion(options: ChatOptions): Promise<string> {
  const { messages, temperature = 0.7, maxTokens = 2000 } = options;

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`豆包API错误: ${response.status} - ${error}`);
  }

  const data: DoubaoResponse = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('豆包API返回空响应');
  }

  return data.choices[0].message.content;
}

/**
 * 流式调用豆包API
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  onChunk: StreamCallback,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<void> {
  const { temperature = 0.7, maxTokens = 2000 } = options;

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`豆包API错误: ${response.status} - ${error}`);
  }

  if (!response.body) {
    throw new Error('响应体为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // 处理SSE格式的数据
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        
        if (data === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          
          if (content) {
            onChunk(content);
          }
        } catch {
          // 忽略解析错误，继续处理下一行
        }
      }
    }
  }
}

/**
 * 构建面试官对话消息
 */
export function buildInterviewMessages(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentMessage: string,
  interviewType?: string,
  resume?: string
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // System prompt with context
  let fullSystemPrompt = systemPrompt;
  
  if (interviewType) {
    fullSystemPrompt += `\n\n【本次面试类型】${interviewType}`;
  }
  
  if (resume) {
    fullSystemPrompt += `\n\n【候选人简历】\n${resume}`;
  }

  messages.push({ role: 'system', content: fullSystemPrompt });

  // Add conversation history (last 10 messages to save tokens)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }

  // Add current message
  messages.push({ role: 'user', content: currentMessage });

  return messages;
}

/**
 * 构建阿搭陪伴对话消息
 */
export function buildCompanionMessages(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentMessage: string
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  messages.push({ role: 'system', content: systemPrompt });

  // Add conversation history
  const recentHistory = conversationHistory.slice(-8);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }

  // Add current message
  messages.push({ role: 'user', content: currentMessage });

  return messages;
}
