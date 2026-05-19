// TTS 语音播放 Hook - 极简版
// 核心：Audio.src = /api/tts?text=... 浏览器原生播放
// 不用blob，不用下载，浏览器自己处理缓冲和播放
// 预加载：创建Audio元素并preload

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
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/[～~]/g, '，')
    .replace(/哎哟[，,！!。]/g, '嗯，')
    .replace(/哎呦[，,！!。]/g, '嗯，')
    .replace(/哟[，,！!。]/g, '，')
    .replace(/嗯嗯+/g, '嗯')
    .replace(/哈哈+/g, '哈哈')
    .replace(/\n+/g, '。')
    .replace(/。{2,}/g, '。')
    .replace(/，{2,}/g, '，')
    .trim();
}

function truncateText(text: string, maxLen = 150): string {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastPunc = Math.max(
    truncated.lastIndexOf('。'), truncated.lastIndexOf('，'),
    truncated.lastIndexOf('！'), truncated.lastIndexOf('？'),
    truncated.lastIndexOf('；')
  );
  if (lastPunc > maxLen * 0.4) return text.substring(0, lastPunc + 1);
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
  const playingIdRef = useRef<string | null>(null);
  // 预加载的Audio元素
  const preloadedAudios = useRef<Map<string, HTMLAudioElement>>(new Map());

  // 清理
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      preloadedAudios.current.forEach(a => { a.pause(); a.src = ''; });
    };
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    playingIdRef.current = null;
    setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
  }, []);

  // 构建API URL
  const buildUrl = useCallback((text: string): string => {
    const clean = truncateText(cleanText(text), 150);
    const params = new URLSearchParams({
      text: clean,
      persona,
      isCompanion: String(isCompanion),
    });
    return `/api/tts?${params.toString()}`;
  }, [persona, isCompanion]);

  // 预加载：创建Audio元素，让浏览器提前缓冲
  const preload = useCallback((text: string, messageId: string) => {
    if (preloadedAudios.current.has(messageId)) return;

    const url = buildUrl(text);
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    preloadedAudios.current.set(messageId, audio);
  }, [buildUrl]);

  const isPreloaded = useCallback((messageId: string) => {
    return preloadedAudios.current.has(messageId);
  }, []);

  const isPreloading = useCallback(() => false, []);

  // 播放
  const play = useCallback(async (text: string, messageId: string) => {
    // 点击同一个：停止
    if (playingIdRef.current === messageId && state.isPlaying) {
      stop();
      return;
    }

    stop();

    setState({ isPlaying: false, playingId: messageId, isLoading: true, error: null });
    playingIdRef.current = messageId;

    // 获取Audio元素（预加载的或新建的）
    let audio = preloadedAudios.current.get(messageId);
    if (!audio) {
      audio = new Audio();
      audio.preload = 'auto';
      audio.src = buildUrl(text);
      preloadedAudios.current.set(messageId, audio);
    }

    audioRef.current = audio;

    // 设置MediaSession（防止系统杀掉音频）
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: '面试搭子语音',
          artist: '面试搭子',
        });
      } catch { /* ignore */ }
    }

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const onCanPlay = () => {
          if (settled) return;
          setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
          audio!.play().catch(err => {
            if (!settled) { settled = true; cleanup(); reject(err); }
          });
        };

        const onEnded = () => {
          if (settled) return;
          settled = true;
          cleanup();
          audioRef.current = null;
          playingIdRef.current = null;
          setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
          resolve();
        };

        const onError = () => {
          if (settled) return;
          settled = true;
          cleanup();
          const errMsg = audio!.error?.message || '播放失败';
          reject(new Error(errMsg));
        };

        const cleanup = () => {
          audio!.removeEventListener('canplay', onCanPlay);
          audio!.removeEventListener('canplaythrough', onCanPlay);
          audio!.removeEventListener('ended', onEnded);
          audio!.removeEventListener('error', onError);
        };

        audio!.addEventListener('canplay', onCanPlay, { once: true });
        audio!.addEventListener('canplaythrough', onCanPlay, { once: true });
        audio!.addEventListener('ended', onEnded);
        audio!.addEventListener('error', onError, { once: true });

        // 如果已经有足够数据，直接播放
        if (audio!.readyState >= 3) {
          onCanPlay();
          return;
        }

        // 如果还没开始加载，触发加载
        if (audio!.readyState === 0) {
          audio!.load();
        }

        // 超时
        setTimeout(() => {
          if (!settled) {
            settled = true;
            cleanup();
            reject(new Error('加载超时'));
          }
        }, 20000);
      });
    } catch (err: unknown) {
      const error = err as Error;
      if (playingIdRef.current === messageId) {
        audioRef.current = null;
        playingIdRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: error.message });
      }
    }
  }, [state.isPlaying, stop, buildUrl]);

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
