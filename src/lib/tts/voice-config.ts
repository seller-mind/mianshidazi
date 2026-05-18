// TTS 音色配置 - 根据面试官人格匹配最合适的音色

/**
 * CosyVoice v3-flash/v3-plus 音色列表（部分）
 * 完整列表请参考：https://help.aliyun.com/zh/model-studio/cosyvoice-voice-list
 * 
 * 音色命名规则：
 * - v3结尾：cosyvoice-v3-flash/cosyvoice-v3-plus 使用
 * - v2结尾：cosyvoice-v2 使用
 * - 无后缀：cosyvoice-v1 使用
 */

// 面试官人格对应的音色
export const PERSONA_VOICE_MAP: Record<string, {
  voice: string;
  name: string;
  description: string;
}> = {
  // 温柔鼓励型 - 温柔淡定的女声，耐心温暖
  A: {
    voice: 'longyingtao_v3',
    name: '龙应桃',
    description: '温柔淡定女，25-30岁',
  },
  // 真实模拟型 - 博才干练的男声，专业冷静
  B: {
    voice: 'longshuo_v2',
    name: '龙硕',
    description: '博才干练男，新闻播报风格',
  },
  // 压力挑战型 - 磁性低音男声，有压迫感
  C: {
    voice: 'longxiaocheng_v2',
    name: '龙小诚',
    description: '磁性低音男，睿智深沉',
  },
  // 犀利毒舌型 - 利落从容的女声，干练直接
  D: {
    voice: 'longanli_v3',
    name: '龙安莉',
    description: '利落从容女，25-35岁',
  },
  // HR老油条型 - 激情推销男声，油腔滑调
  E: {
    voice: 'longanchong_v3',
    name: '龙安冲',
    description: '激情推销男，直播带货风格',
  },
};

// 阿搭陪伴音色 - 温暖亲切
export const COMPANION_VOICE = {
  voice: 'longhua_v3',
  name: '龙华',
  description: '元气甜美女，20-25岁，像朋友聊天',
};

/**
 * 获取指定人格对应的音色
 */
export function getVoiceForPersona(persona: string): { voice: string; name: string; description: string } {
  return PERSONA_VOICE_MAP[persona] || PERSONA_VOICE_MAP['A'];
}

/**
 * 获取阿搭陪伴的音色
 */
export function getCompanionVoice(): { voice: string; name: string; description: string } {
  return COMPANION_VOICE;
}
