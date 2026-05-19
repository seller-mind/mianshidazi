// TTS 语音播放 Hook - 使用浏览器原生 Web Speech API
// 优势：完全客户端执行，无需服务器，零超时风险
// 降级策略：不支持 speechSynthesis 的浏览器自动隐藏语音按钮

import { useState, useRef, useCallback, useEffect } from 'react';

export interface TTSState {
  isPlaying: boolean;
  playingId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseTTSOptions {
  persona?: string;
  isCompanion?: boolean;
}

// 面试官人格对应的语音参数
const PERSONA_VOICE_PARAMS: Record<string, { pitch: number; rate: number; preferGender: 'male' | 'female' }> = {
  // 温柔鼓励型 - 女声，语速稍慢，音调稍高
  A: { pitch: 1.15, rate: 0.95, preferGender: 'female' },
  // 真实模拟型 - 男声，正常语速
  B: { pitch: 1.0, rate: 1.0, preferGender: 'male' },
  // 压力挑战型 - 男声，语速稍快，音调偏低
  C: { pitch: 0.9, rate: 1.05, preferGender: 'male' },
  // 犀利毒舌型 - 女声，语速快
  D: { pitch: 1.05, rate: 1.1, preferGender: 'female' },
  // HR老油条型 - 男声，语速慢
  E: { pitch: 0.95, rate: 0.9, preferGender: 'male' },
};

// 陪伴模式 - 女声，温柔
const COMPANION_VOICE_PARAMS = { pitch: 1.1, rate: 0.95, preferGender: 'female' as const };

// 等待语音列表加载（移动端首次可能为空）
function getVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    // 等待 voiceschanged 事件（移动端 Chrome 需要）
    const handler = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(v);
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // 超时兜底：3秒后无论如何继续（用空列表也行，设置 lang 即可）
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
    }, 3000);
  });
}

// 选择最合适的中文语音
function pickChineseVoice(voices: SpeechSynthesisVoice[], preferGender: 'male' | 'female'): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  // 优先级1: zh-CN + 性别匹配
  const zhCN = voices.filter(v => v.lang === 'zh-CN');
  if (zhCN.length > 0) {
    const genderMatch = zhCN.find(v => {
      const name = v.name.toLowerCase();
      if (preferGender === 'female') return name.includes('female') || name.includes('女') || name.includes('xiao') || name.includes('hui');
      return name.includes('male') && !name.includes('female') || name.includes('男') || name.includes('yun');
    });
    if (genderMatch) return genderMatch;
    return zhCN[0];
  }

  // 优先级2: 任何 zh 开头的语音
  const zhAny = voices.filter(v => v.lang.startsWith('zh'));
  if (zhAny.length > 0) return zhAny[0];

  // 优先级3: 任何可用语音
  return voices[0];
}

// 检测浏览器是否支持语音合成
export function isTTSSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

export function useTTS(options: UseTTSOptions = {}) {
  const { persona = 'A', isCompanion = false } = options;
  
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    playingId: null,
    isLoading: false,
    error: null,
  });

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentPlayingIdRef = useRef<string | null>(null);

  // 预加载语音列表（某些浏览器需要异步加载）
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // 触发语音列表加载
      window.speechSynthesis.getVoices();
      // Chrome 需要监听 onvoiceschanged 事件
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      // 清理：停止播放
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      currentUtteranceRef.current = null;
      currentPlayingIdRef.current = null;
    };
  }, []);

  // 停止播放
  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    currentUtteranceRef.current = null;
    currentPlayingIdRef.current = null;
    setState({
      isPlaying: false,
      playingId: null,
      isLoading: false,
      error: null,
    });
  }, []);

  // 播放语音
  const play = useCallback(async (text: string, messageId: string) => {
    // 如果正在播放同一条消息，则停止
    if (currentPlayingIdRef.current === messageId && state.isPlaying) {
      stop();
      return;
    }

    // 停止之前的播放
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // 检查浏览器支持
    if (!isTTSSupported()) {
      setState({
        isPlaying: false,
        playingId: null,
        isLoading: false,
        error: '您的浏览器不支持语音功能',
      });
      return;
    }

    setState({
      isPlaying: false,
      playingId: messageId,
      isLoading: true,
      error: null,
    });

    try {
      // 获取语音参数
      const params = isCompanion ? COMPANION_VOICE_PARAMS : (PERSONA_VOICE_PARAMS[persona] || PERSONA_VOICE_PARAMS['A']);
      
      // 等待语音列表加载后选择语音
      const voices = await getVoicesReady();
      const voice = pickChineseVoice(voices, params.preferGender);

      // 清理文本（移除 emoji 和特殊字符）
      const cleanText = text
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // 表情
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // 符号
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // 交通
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // 旗帜
        .replace(/[\u{2702}-\u{27B0}]/gu, '')   // 装饰
        .replace(/\*\*/g, '')                    // Markdown 加粗
        .replace(/#{1,6}\s/g, '')                // Markdown 标题
        .replace(/[「」『』]/g, '')               // 引号
        .replace(/\n+/g, '，')                   // 换行替换为逗号（自然停顿）
        .trim();

      if (!cleanText) {
        setState({
          isPlaying: false,
          playingId: null,
          isLoading: false,
          error: '没有可朗读的内容',
        });
        return;
      }

      // 创建语音合成
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'zh-CN';
      utterance.rate = params.rate;
      utterance.pitch = params.pitch;
      utterance.volume = 1;

      if (voice) {
        utterance.voice = voice;
      }

      currentUtteranceRef.current = utterance;
      currentPlayingIdRef.current = messageId;

      utterance.onstart = () => {
        setState({
          isPlaying: true,
          playingId: messageId,
          isLoading: false,
          error: null,
        });
      };

      utterance.onend = () => {
        if (currentPlayingIdRef.current === messageId) {
          currentUtteranceRef.current = null;
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: null,
          });
        }
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        if (currentPlayingIdRef.current === messageId) {
          currentUtteranceRef.current = null;
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: event.error === 'canceled' ? null : '语音播放失败',
          });
        }
      };

      // 开始播放
      window.speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('TTS play error:', error);
      currentUtteranceRef.current = null;
      currentPlayingIdRef.current = null;
      setState({
        isPlaying: false,
        playingId: null,
        isLoading: false,
        error: error instanceof Error ? error.message : '语音合成失败',
      });
    }
  }, [persona, isCompanion, state.isPlaying, stop]);

  // 检查指定消息是否正在播放
  const isPlayingMessage = useCallback((messageId: string) => {
    return state.playingId === messageId && state.isPlaying;
  }, [state.playingId, state.isPlaying]);

  // 检查指定消息是否正在加载
  const isLoadingMessage = useCallback((messageId: string) => {
    return state.playingId === messageId && state.isLoading;
  }, [state.playingId, state.isLoading]);

  return {
    ...state,
    play,
    stop,
    isPlayingMessage,
    isLoadingMessage,
  };
}
