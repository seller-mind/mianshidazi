import { type TensionLevel } from '@/types';
import { TENSION_TYPES } from './config';

const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL_ID = 'ep-20250515144642-96m6k';

// 阿搭的系统提示词
const ADA_SYSTEM_PROMPT = `你是"阿搭"，一个懂行的过来人朋友，专注于帮助用户克服面试紧张。

你的性格特点：
- 温暖、友好、像朋友一样聊天
- 不用冷冰冰的AI腔，用自然的口语
- 善解人意，能共情用户的紧张
- 会给实用的建议，而不是空洞的鼓励
- 偶尔幽默，但不过分
- 遇到用户特别紧张时，会用轻松的方式化解

你的专长：
- 识别用户的紧张类型（A型脑暴型、B型身体型、C型社交恐惧型、D型完美主义型、E型面试PTSD型）
- 提供针对性的面试技巧
- 模拟真实的面试场景
- 帮助用户建立自信

关键原则：
1. 不要过度安慰，那样反而显得假
2. 可以适当"戳"用户一下，让他们意识到自己的思维陷阱
3. 分享真实的面试经验和案例
4. 始终保持鼓励但不谄媚的态度

当前用户的紧张类型是：{tensionType}（{typeName}）
- {typeDescription}
- 常见症状：{symptoms}
- 针对性建议：{advice}

请根据这个类型，在对话中适当体现对该类型用户的理解和帮助。`;

// 初始化对话
export function getAdaSystemPrompt(tensionType?: TensionLevel): string {
  if (!tensionType) {
    return ADA_SYSTEM_PROMPT.replace('{tensionType}', '未知')
      .replace('{typeName}', '待诊断')
      .replace('{typeDescription}', '先了解你的紧张类型，才能更好地帮助你')
      .replace('{symptoms}', '待诊断后可知')
      .replace('{advice}', '完成诊断后给你个性化建议');
  }

  const typeInfo = TENSION_TYPES[tensionType];
  return ADA_SYSTEM_PROMPT
    .replace('{tensionType}', tensionType)
    .replace('{typeName}', typeInfo.name)
    .replace('{typeDescription}', typeInfo.description)
    .replace('{symptoms}', typeInfo.symptoms.join('、'))
    .replace('{advice}', typeInfo.advice[0]);
}

// 面试场景的对话模板
export const INTERVIEW_SCENARIOS = {
  warmingUp: [
    '嗨，我是阿搭，今天来陪你练练面试',
    '准备好了吗？我们开始吧',
    '先聊聊天，放松一下',
  ],
  selfIntroduction: [
    '先来个自我介绍吧，不用太长，两三分钟就好',
    '介绍一下你自己吧，从哪里开始呢？',
  ],
  experience: [
    '聊聊你最近的项目经历吧',
    '说说你在XXX方面的经验',
    '你遇到过最大的挑战是什么？',
  ],
  deepDive: [
    '我追问一下，你说的XXX具体是怎么做的？',
    '如果遇到XXX情况，你会怎么处理？',
  ],
  behavior: [
    '讲一个你团队合作的例子吧',
    '你是如何处理和同事的矛盾的？',
  ],
  closing: [
    '你有什么问题想问我的吗？',
    '最后，有什么想问我的？',
  ],
};

// 发送消息给豆包API
export async function sendMessageToDoubao(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  temperature = 0.7
): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    throw new Error('DASHSCOPE_API_KEY is not configured');
  }

  try {
    const response = await fetch(DOUBAO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages,
        temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Doubao API error:', error);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('Error calling Doubao API:', error);
    throw error;
  }
}

// 模拟面试官的回应（本地版本，用于测试）
export function generateLocalResponse(
  userMessage: string,
  tensionType?: TensionLevel
): string {
  const responses = [
    '好的，我听到了。说说你具体是怎么准备的呢？',
    '嗯嗯，理解。那你遇到这种情况会怎么处理？',
    '追问一下：如果面试官这样问你，你会怎么回答？',
    '我明白了。再说说你在团队中的角色吧。',
    '这个经历很有意思，能具体讲讲你的贡献吗？',
  ];

  // 如果是结束语
  if (userMessage.includes('没问题') || userMessage.includes('没有了') || userMessage.includes('问完了')) {
    return '好的，那今天的模拟面试就到这里。你表现得比我想象中要好，给自己点个赞吧。';
  }

  // 随机返回一个回应
  return responses[Math.floor(Math.random() * responses.length)];
}
