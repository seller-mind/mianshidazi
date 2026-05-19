// TTS 语音播放 Hook - 混合策略
// 优先使用浏览器原生 Web Speech API（零延迟、零成本）
// 不支持时降级到服务端 edge-tts（/api/tts，限制文本长度避免超时）
// 按钮始终显示，错误时提示用户

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
  A: { pitch: 1.15, rate: 0.95, preferGender: 'female' },
  B: { pitch: 1.0, rate: 1.0, preferGender: 'male' },
  C: { pitch: 0.9, rate: 1.05, preferGender: 'male' },
  D: { pitch: 1.05, rate: 1.1, preferGender: 'female' },
  E: { pitch: 0.95, rate: 0.9, preferGender: 'male' },
};

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
    const handler = () => {
      const v = window.speechSynthesis!.getVoices();
      if (v.length > 0) {
        window.speechSynthesis!.removeEventListener('voiceschanged', handler);
        resolve(v);
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    setTimeout(() => {
      window.speechSynthesis!.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis!.getVoices());
    }, 3000);
  });
}

function pickChineseVoice(voices: SpeechSynthesisVoice[], preferGender: 'male' | 'female'): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const zhCN = voices.filter(v => v.lang === 'zh-CN');
  if (zhCN.length > 0) {
    const genderMatch = zhCN.find(v => {
      const name = v.name.toLowerCase();
      if (preferGender === 'female') return name.includes('female') || name.includes('女') || name.includes('xiao') || name.includes('hui');
      return (name.includes('male') && !name.includes('female')) || name.includes('男') || name.includes('yun');
    });
    if (genderMatch) return genderMatch;
    return zhCN[0];
  }

  const zhAny = voices.filter(v => v.lang.startsWith('zh'));
  if (zhAny.length > 0) return zhAny[0];

  return voices[0];
}

// 清理文本
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/\n+/g, '，')
    .trim();
}

// 截断文本到安全长度（服务端 TTS 用，避免 Vercel 超时）
function truncateForServer(text: string, maxChars = 150): string {
  if (text.length <= maxChars) return text;
  // 优先在句号/逗号处截断
  const truncated = text.substring(0, maxChars);
  const lastPunc = Math.max(truncated.lastIndexOf('。'), truncated.lastIndexOf('，'), truncated.lastIndexOf('！'), truncated.lastIndexOf('？'));
  if (lastPunc > maxChars * 0.5) {
    return text.substring(0, lastPunc + 1);
  }
  return truncated + '…';
}

// 检测是否支持 Web Speech API
function hasNativeSpeech(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function useTTS(options: UseTTSOptions = {}) {
  const { persona = 'A', isCompanion = false } = options;
  
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    playingId: null,
    isLoading: false,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPlayingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (hasNativeSpeech()) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis!.getVoices();
      };
    }

    return () => {
      if (hasNativeSpeech()) {
        window.speechSynthesis!.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      currentPlayingIdRef.current = null;
    };
  }, []);

  // 停止播放
  const stop = useCallback(() => {
    if (hasNativeSpeech()) {
      window.speechSynthesis!.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    currentPlayingIdRef.current = null;
    setState({
      isPlaying: false,
      playingId: null,
      isLoading: false,
      error: null,
    });
  }, []);

  // === 方案1: 浏览器原生 Web Speech API ===
  const playNative = useCallback(async (text: string, messageId: string, params: typeof PERSONA_VOICE_PARAMS['A']) => {
    const voices = await getVoicesReady();
    const voice = pickChineseVoice(voices, params.preferGender);
    const clean = cleanTextForSpeech(text);

    if (!clean) {
      throw new Error('没有可朗读的内容');
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'zh-CN';
    utterance.rate = params.rate;
    utterance.pitch = params.pitch;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;

    currentPlayingIdRef.current = messageId;

    return new Promise<void>((resolve, reject) => {
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
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: null,
          });
        }
        resolve();
      };

      utterance.onerror = (event) => {
        if (currentPlayingIdRef.current === messageId) {
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: event.error === 'canceled' ? null : '语音播放失败',
          });
        }
        reject(new Error(event.error));
      };

      window.speechSynthesis!.speak(utterance);
    });
  }, []);

  // === 方案2: 服务端 edge-tts（文本截断避免超时）===
  const playServer = useCallback(async (text: string, messageId: string) => {
    const clean = cleanTextForSpeech(text);
    if (!clean) throw new Error('没有可朗读的内容');

    // 截断文本，避免 Vercel 10 秒超时
    const safeText = truncateForServer(clean, 150);

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: safeText,
        persona,
        isCompanion,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '语音合成失败');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    currentPlayingIdRef.current = messageId;

    return new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (currentPlayingIdRef.current === messageId) {
          audioRef.current = null;
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: null,
          });
        }
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (currentPlayingIdRef.current === messageId) {
          audioRef.current = null;
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: '音频播放失败',
          });
        }
        reject(new Error('音频播放失败'));
      };

      setState({
        isPlaying: true,
        playingId: messageId,
        isLoading: false,
        error: null,
      });

      audio.play().catch(reject);
    });
  }, [persona, isCompanion]);

  // 播放语音（主入口）
  const play = useCallback(async (text: string, messageId: string) => {
    // 如果正在播放同一条消息，则停止
    if (currentPlayingIdRef.current === messageId && state.isPlaying) {
      stop();
      return;
    }

    // 停止之前的播放
    stop();

    setState({
      isPlaying: false,
      playingId: messageId,
      isLoading: true,
      error: null,
    });

    try {
      const params = isCompanion ? COMPANION_VOICE_PARAMS : (PERSONA_VOICE_PARAMS[persona] || PERSONA_VOICE_PARAMS['A']);

      if (hasNativeSpeech()) {
        // 优先用浏览器原生
        await playNative(text, messageId, params);
      } else {
        // 降级到服务端 edge-tts
        await playServer(text, messageId);
      }
    } catch (error) {
      console.error('TTS play error:', error);
      currentPlayingIdRef.current = null;

      // 如果原生失败，尝试降级到服务端
      if (hasNativeSpeech()) {
        try {
          await playServer(text, messageId);
          return;
        } catch (serverError) {
          console.error('Server TTS also failed:', serverError);
        }
      }

      setState({
        isPlaying: false,
        playingId: null,
        isLoading: false,
        error: error instanceof Error ? error.message : '语音合成失败',
      });
    }
  }, [persona, isCompanion, state.isPlaying, stop, playNative, playServer]);

  const isPlayingMessage = useCallback((messageId: string) => {
    return state.playingId === messageId && state.isPlaying;
  }, [state.playingId, state.isPlaying]);

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
