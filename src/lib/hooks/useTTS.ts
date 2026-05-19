// TTS 语音播放 Hook
// 方案1: 服务端 CosyVoice（阿里云百炼，高质量神经网络语音）
// 方案2: 百度翻译 TTS 兜底（机械感但稳定）
// 播放方式：<audio> 元素（最兼容 WebView）

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
    .replace(/\n+/g, '，')
    .trim();
}

// 截断文本
function truncateText(text: string, maxLen = 300): string {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastPunc = Math.max(
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('，'),
    truncated.lastIndexOf('！'),
    truncated.lastIndexOf('？')
  );
  if (lastPunc > maxLen * 0.5) return text.substring(0, lastPunc + 1);
  return truncated + '…';
}

// 构建服务端 TTS URL
function buildServerTTSUrl(text: string, persona: string, isCompanion: boolean): string {
  const params = new URLSearchParams({
    text: truncateText(cleanText(text), 300),
    persona,
    isCompanion: String(isCompanion),
  });
  return `/api/tts?${params.toString()}`;
}

// 百度 TTS URL（兜底）
function buildBaiduTTSUrl(text: string, speed: number = 5): string {
  const clean = truncateText(cleanText(text), 200);
  return `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(clean)}&spd=${speed}&source=web`;
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
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

  // 播放 URL 音频
  const playAudioUrl = useCallback((audioUrl: string, messageId: string, timeoutMs = 10000): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
      currentPlayingIdRef.current = messageId;

      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error('音频加载超时'));
        }
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };

      const onCanPlay = () => {
        setState({
          isPlaying: true,
          playingId: messageId,
          isLoading: false,
          error: null,
        });
        audio.play().catch((e) => {
          if (!settled) {
            settled = true;
            cleanup();
            reject(e);
          }
        });
      };

      const onEnded = () => {
        if (!settled) {
          settled = true;
          cleanup();
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
        }
      };

      const onError = () => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error('音频加载失败'));
        }
      };

      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError, { once: true });

      audio.src = audioUrl;
    });
  }, []);

  const play = useCallback(async (text: string, messageId: string) => {
    // 点击同一条：停止
    if (currentPlayingIdRef.current === messageId && state.isPlaying) {
      stop();
      return;
    }

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
      // 方案1: 服务端 CosyVoice（高质量）
      const serverUrl = buildServerTTSUrl(text, persona, isCompanion);
      await playAudioUrl(serverUrl, messageId, 10000);
    } catch (serverError) {
      console.warn('CosyVoice TTS failed, trying Baidu TTS:', serverError);

      if (currentPlayingIdRef.current !== messageId) return;

      try {
        // 方案2: 百度翻译 TTS 兜底
        setState({
          isPlaying: false,
          playingId: messageId,
          isLoading: true,
          error: null,
        });
        const speed = isCompanion ? 5 : 5;
        const baiduUrl = buildBaiduTTSUrl(text, speed);
        await playAudioUrl(baiduUrl, messageId, 8000);
      } catch (baiduError) {
        console.error('All TTS failed:', baiduError);
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
    }
  }, [persona, isCompanion, state.isPlaying, stop, playAudioUrl]);

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
