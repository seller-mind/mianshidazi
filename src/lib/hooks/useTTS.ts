// TTS 语音播放 Hook - 百度翻译 TTS 方案
// 不依赖服务端，直接用百度翻译的免费 TTS 接口
// 优势：全客户端、无超时、跨浏览器/WebView 兼容
// 播放方式：<audio> 元素，最兼容

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

// 面试官人格对应的语速
const PERSONA_SPEED: Record<string, number> = {
  A: 4,  // 温柔鼓励 - 稍慢
  B: 5,  // 真实模拟 - 正常
  C: 6,  // 压力挑战 - 稍快
  D: 6,  // 犀利毒舌 - 稍快
  E: 4,  // HR老油条 - 稍慢
};

// 清理文本
function cleanText(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/\n+/g, ',')
    .trim();
}

// 百度翻译 TTS URL（免费，无需 API Key）
// spd: 语速 0-9，5 为正常
function buildBaiduTTSUrl(text: string, speed: number = 5): string {
  const clean = cleanText(text);
  // 百度 TTS 限制约 200 字，超长截断
  const safeText = clean.length > 200 ? clean.substring(0, 200) : clean;
  return `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(safeText)}&spd=${speed}&source=web`;
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

  // 清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 停止播放
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
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

  // 播放语音
  const play = useCallback(async (text: string, messageId: string) => {
    // 点击同一条：停止
    if (currentPlayingIdRef.current === messageId && state.isPlaying) {
      stop();
      return;
    }

    // 停止之前的
    stop();

    const clean = cleanText(text);
    if (!clean) return;

    setState({
      isPlaying: false,
      playingId: messageId,
      isLoading: true,
      error: null,
    });

    try {
      // 语速
      const speed = isCompanion ? 4 : (PERSONA_SPEED[persona] || 5);

      // 创建音频
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
      currentPlayingIdRef.current = messageId;

      // 用 Promise 等待播放完成
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('音频加载超时'));
        }, 8000);

        audio.oncanplaythrough = () => {
          clearTimeout(timeout);
          setState({
            isPlaying: true,
            playingId: messageId,
            isLoading: false,
            error: null,
          });
          audio.play().catch(reject);
        };

        audio.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('音频加载失败'));
        };

        audio.onended = () => {
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

        // 设置音频源
        audio.src = buildBaiduTTSUrl(text, speed);
        audio.load();
      });

    } catch (error) {
      console.error('TTS error:', error);
      if (currentPlayingIdRef.current === messageId) {
        audioRef.current = null;
        currentPlayingIdRef.current = null;
        setState({
          isPlaying: false,
          playingId: null,
          isLoading: false,
          error: '语音暂时不可用',
        });
      }
    }
  }, [persona, isCompanion, state.isPlaying, stop]);

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
