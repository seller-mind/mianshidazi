// TTS 语音播放 Hook
// 核心方案：fetch /api/tts 获取音频URL → Audio 播放
// 短文本返回 { url }，长文本返回 { urls: [...] }
// 多段音频按顺序播放，无缝衔接

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
    .replace(/\n+/g, '。')
    .trim();
}

function truncateText(text: string, maxLen = 800): string {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastPunc = Math.max(
    truncated.lastIndexOf('。'), truncated.lastIndexOf('，'),
    truncated.lastIndexOf('！'), truncated.lastIndexOf('？')
  );
  if (lastPunc > maxLen * 0.5) return text.substring(0, lastPunc + 1);
  return truncated + '…';
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
  const abortControllerRef = useRef<AbortController | null>(null);
  // 预加载缓存: messageId → url 或 urls
  const preloadedCache = useRef<Map<string, { url?: string; urls?: string[] }>>(new Map());

  // 清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      preloadedCache.current.clear();
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    currentPlayingIdRef.current = null;
    setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
  }, []);

  // 构建 /api/tts 的URL
  const buildTtsUrl = useCallback((text: string): string => {
    const params = new URLSearchParams({
      text: truncateText(cleanText(text), 800),
      persona,
      isCompanion: String(isCompanion),
    });
    return `/api/tts?${params.toString()}`;
  }, [persona, isCompanion]);

  // 预加载
  const preload = useCallback(async (text: string, messageId: string) => {
    if (preloadedCache.current.has(messageId)) return;

    const clean = truncateText(cleanText(text), 800);
    if (!clean) return;

    try {
      const response = await fetch(buildTtsUrl(text));
      if (!response.ok) return;

      const data = await response.json();
      if (data.url || data.urls) {
        preloadedCache.current.set(messageId, data);
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        console.warn('TTS preload error:', error.message);
      }
    }
  }, [buildTtsUrl]);

  const isPreloaded = useCallback((messageId: string) => {
    return preloadedCache.current.has(messageId);
  }, []);

  const isPreloading = useCallback(() => false, []);

  // 播放单个音频URL
  const playSingleAudio = useCallback((audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      let settled = false;

      const onCanPlay = () => {
        if (settled) return;
        audio.play().catch(err => {
          if (!settled) { settled = true; cleanup(); reject(err); }
        });
      };

      const onEnded = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('音频播放失败'));
      };

      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('canplaythrough', onCanPlay, { once: true });
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError, { once: true });

      if (audio.readyState >= 3) {
        onCanPlay();
        return;
      }

      audio.load();

      setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error('音频加载超时'));
        }
      }, 15000);
    });
  }, []);

  // 播放多个音频URL（按顺序）
  const playMultipleAudio = useCallback(async (urls: string[], messageId: string): Promise<void> => {
    for (let i = 0; i < urls.length; i++) {
      // 如果已被取消，停止播放
      if (currentPlayingIdRef.current !== messageId) return;

      setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
      await playSingleAudio(urls[i]);
    }
  }, [playSingleAudio]);

  // 主播放入口
  const play = useCallback(async (text: string, messageId: string) => {
    // 点击同一条：停止
    if (currentPlayingIdRef.current === messageId && state.isPlaying) {
      stop();
      return;
    }

    stop();

    const clean = cleanText(text);
    if (!clean) return;

    setState({ isPlaying: false, playingId: messageId, isLoading: true, error: null });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let data: { url?: string; urls?: string[] } | null = null;

      // 1. 检查预加载缓存
      const preloaded = preloadedCache.current.get(messageId);
      if (preloaded) {
        data = preloaded;
      } else {
        // 2. fetch获取音频URL
        const response = await fetch(buildTtsUrl(text), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`);
        }

        const result = await response.json();
        if (result.error) {
          throw new Error(result.error);
        }
        if (!result.url && !result.urls) {
          throw new Error('未获取到音频URL');
        }

        data = result;
        preloadedCache.current.set(messageId, result);
      }

      currentPlayingIdRef.current = messageId;

      // 多段音频按顺序播放
      if (data?.urls && data.urls.length > 0) {
        await playMultipleAudio(data.urls, messageId);
      } else if (data?.url) {
        setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
        await playSingleAudio(data.url);
      }

      // 播放完毕
      audioRef.current = null;
      currentPlayingIdRef.current = null;
      setState({ isPlaying: false, playingId: null, isLoading: false, error: null });

    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'AbortError') return;

      console.warn('TTS play failed:', error.message);
      if (currentPlayingIdRef.current === messageId) {
        audioRef.current = null;
        currentPlayingIdRef.current = null;
        abortControllerRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: error.message || '语音暂时不可用' });
      }
    }
  }, [state.isPlaying, stop, buildTtsUrl, playSingleAudio, playMultipleAudio]);

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
    preload,
    isPreloaded,
    isPreloading,
    isPlayingMessage,
    isLoadingMessage,
  };
}
