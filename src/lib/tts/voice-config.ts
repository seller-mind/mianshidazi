// TTS 音色配置 - 根据面试官人格匹配最合适的 edge-tts 音色
// edge-tts 是微软提供的免费 TTS 服务，完全免费无限制

/**
 * edge-tts 中文音色列表（常用）
 * 完整列表可通过 GET /api/tts 获取
 * 
 * 音色风格说明：
 * - XiaoxiaoNeural: 温柔女声，适合鼓励型人格
 * - YunxiNeural: 磁性男声，适合压力挑战型
 * - XiaoyiNeural: 活泼女声
 * - XiaohanNeural: 知性女声
 * - XiaomoNeural: 成熟女声
 * - YunfengNeural: 成熟男声
 * - YunyangNeural: 新闻播报男声
 * - XiaochenNeural: 温柔女声
 * - XiaoruiNeural: 沉稳女声
 * - XiaoxuanNeural: 温柔女声
 */

// 面试官人格对应的 edge-tts 音色
export const EDGE_VOICE_MAP: Record<string, {
  voice: string;
  name: string;
  description: string;
}> = {
  // 温柔鼓励型 - 温柔女声，耐心温暖
  A: {
    voice: 'zh-CN-XiaoxiaoNeural',
    name: '晓晓',
    description: '温柔女声，耐心温暖',
  },
  // 真实模拟型 - 新闻播报男声，专业冷静
  B: {
    voice: 'zh-CN-YunyangNeural',
    name: '云扬',
    description: '新闻播报男声，专业冷静',
  },
  // 压力挑战型 - 磁性低音男声，有压迫感
  C: {
    voice: 'zh-CN-YunxiNeural',
    name: '云希',
    description: '磁性低音男声，睿智深沉',
  },
  // 犀利毒舌型 - 成熟女声，干练直接
  D: {
    voice: 'zh-CN-XiaomoNeural',
    name: '晓墨',
    description: '成熟女声，干练直接',
  },
  // HR老油条型 - 圆滑男声
  E: {
    voice: 'zh-CN-YunfengNeural',
    name: '云风',
    description: '成熟男声，沉稳老练',
  },
};

// 阿搭陪伴音色 - 温暖亲切女声
export const COMPANION_EDGE_VOICE = {
  voice: 'zh-CN-XiaoyiNeural',
  name: '小艺',
  description: '活泼女声，像朋友聊天',
};

// 保持向后兼容的旧接口
export const PERSONA_VOICE_MAP = EDGE_VOICE_MAP;
export const COMPANION_VOICE = COMPANION_EDGE_VOICE;

/**
 * 获取指定人格对应的 edge-tts 音色
 */
export function getVoiceForPersona(persona: string): { voice: string; name: string; description: string } {
  return EDGE_VOICE_MAP[persona] || EDGE_VOICE_MAP['A'];
}

/**
 * 获取阿搭陪伴的 edge-tts 音色
 */
export function getCompanionVoice(): { voice: string; name: string; description: string } {
  return COMPANION_EDGE_VOICE;
}
