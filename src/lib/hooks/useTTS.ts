// TTS 语音播放 Hook
// 核心方案：Audio元素直接指向 /api/tts 接口播放
// 不用fetch！Audio元素自己处理加载、重定向、播放
// 这和之前百度TTS能出声的方式完全一样

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
    .replace(/\n+/g, '，')
    .trim();
}

function truncateText(text: string, maxLen = 300): string {
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
  // 预加载的Audio元素缓存
  const preloadedAudios = useRef<Map<string, HTMLAudioElement>>(new Map());

  // 清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      preloadedAudios.current.forEach(a => { a.pause(); a.src = ''; });
      preloadedAudios.current.clear();
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    currentPlayingIdRef.current = null;
    setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
  }, []);

  // 构建 /api/tts 的URL
  const buildTtsUrl = useCallback((text: string): string => {
    const params = new URLSearchParams({
      text: truncateText(cleanText(text), 300),
      persona,
      isCompanion: String(isCompanion),
    });
    return `/api/tts?${params.toString()}`;
  }, [persona, isCompanion]);

  // 预加载：AI消息出现时创建Audio元素并预加载
  const preload = useCallback((text: string, messageId: string) => {
    if (preloadedAudios.current.has(messageId)) return;

    const clean = truncateText(cleanText(text), 300);
    if (!clean) return;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = buildTtsUrl(text);
    preloadedAudios.current.set(messageId, audio);
  }, [buildTtsUrl]);

  const isPreloaded = useCallback((messageId: string) => {
    return preloadedAudios.current.has(messageId);
  }, []);

  const isPreloading = useCallback((messageId: string) => {
    return false;
  }, []);

  // 播放音频 - 核心方法
  const playAudio = useCallback((audio: HTMLAudioElement, messageId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 停止当前播放
      if (audioRef.current && audioRef.current !== audio) {
        audioRef.current.pause();
      }

      audioRef.current = audio;
      currentPlayingIdRef.current = messageId;

      let settled = false;

      const onCanPlay = () => {
        if (settled) return;
        setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
        audio.play().catch(e => {
          if (!settled) { settled = true; cleanup(); reject(e); }
        });
      };

      const onEnded = () => {
        if (settled) return;
        settled = true;
        cleanup();
        if (currentPlayingIdRef.current === messageId) {
          audioRef.current = null;
          currentPlayingIdRef.current = null;
          setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
        }
        resolve();
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('音频加载失败'));
      };

      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('canplaythrough', onCanPlay, { once: true });
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError, { once: true });

      // 如果音频已经加载好了（预加载命中），直接播放
      if (audio.readyState >= 3) { // HAVE_FUTURE_DATA
        onCanPlay();
        return;
      }

      // 开始加载
      audio.load();

      // 10秒超时
      setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error('音频加载超时'));
        }
      }, 10000);
    });
  }, []);

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

    try {
      // 1. 检查预加载缓存
      const preloaded = preloadedAudios.current.get(messageId);
      if (preloaded) {
        await playAudio(preloaded, messageId);
        return;
      }

      // 2. 创建新的Audio元素指向 /api/tts
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = buildTtsUrl(text);
      preloadedAudios.current.set(messageId, audio);

      await playAudio(audio, messageId);
    } catch (err) {
      console.warn('TTS play failed:', err);
      if (currentPlayingIdRef.current === messageId) {
        audioRef.current = null;
        currentPlayingIdRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: '语音暂时不可用' });
      }
    }
  }, [state.isPlaying, stop, playAudio, buildTtsUrl]);

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
