// TTS 语音播放 Hook
// 核心方案：fetch + blob 方式
// 原因：可以检查 response.ok 和 content-type，如果API返回错误可以立即知道
// Audio(src) 方式如果服务端返回JSON错误，Audio不会报error，只会永远loading

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
  const abortControllerRef = useRef<AbortController | null>(null);
  // 预加载的 blob URL 缓存
  const preloadedUrls = useRef<Map<string, string>>(new Map());

  // 清理
  useEffect(() => {
    return () => {
      // 停止播放
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // 取消进行中的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // 清理预加载的 blob URL
      preloadedUrls.current.forEach(url => URL.revokeObjectURL(url));
      preloadedUrls.current.clear();
    };
  }, []);

  const stop = useCallback(() => {
    // 停止当前播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    // 取消进行中的请求
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
      text: truncateText(cleanText(text), 300),
      persona,
      isCompanion: String(isCompanion),
    });
    return `/api/tts?${params.toString()}`;
  }, [persona, isCompanion]);

  // 预加载：fetch + blob 方式
  const preload = useCallback(async (text: string, messageId: string) => {
    if (preloadedUrls.current.has(messageId)) return;

    const clean = truncateText(cleanText(text), 300);
    if (!clean) return;

    const controller = new AbortController();

    try {
      const response = await fetch(buildTtsUrl(text), {
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn('TTS preload failed:', response.status);
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        console.warn('TTS preload got JSON error');
        return;
      }

      const blob = await response.blob();
      if (blob.size > 0) {
        const blobUrl = URL.createObjectURL(blob);
        preloadedUrls.current.set(messageId, blobUrl);
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        console.warn('TTS preload error:', error.message);
      }
    }
  }, [buildTtsUrl]);

  const isPreloaded = useCallback((messageId: string) => {
    return preloadedUrls.current.has(messageId);
  }, []);

  const isPreloading = useCallback(() => false, []);

  // 播放音频 - fetch + blob 方式
  const playAudioFromUrl = useCallback(async (blobUrl: string, messageId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 停止当前播放
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      const audio = new Audio(blobUrl);
      audioRef.current = audio;
      currentPlayingIdRef.current = messageId;

      let settled = false;

      const onEnded = () => {
        if (settled) return;
        settled = true;
        cleanup();
        audioRef.current = null;
        currentPlayingIdRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
        resolve();
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        audioRef.current = null;
        currentPlayingIdRef.current = null;
        reject(new Error('音频播放失败'));
      };

      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
      audio.play().catch(err => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(err);
        }
      });
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

    // 创建新的 AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let blobUrl: string | null = null;

      // 1. 检查预加载缓存
      const preloaded = preloadedUrls.current.get(messageId);
      if (preloaded) {
        blobUrl = preloaded;
      } else {
        // 2. 直接fetch获取blob
        const response = await fetch(buildTtsUrl(text), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '语音合成失败');
        }

        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('音频为空');
        }

        blobUrl = URL.createObjectURL(blob);
        // 存入预加载缓存
        preloadedUrls.current.set(messageId, blobUrl);
      }

      if (!blobUrl) {
        throw new Error('无法获取音频');
      }

      await playAudioFromUrl(blobUrl, messageId);

    } catch (err: unknown) {
      const error = err as Error;
      // AbortError 忽略
      if (error.name === 'AbortError') {
        return;
      }

      console.warn('TTS play failed:', error.message);
      if (currentPlayingIdRef.current === messageId) {
        audioRef.current = null;
        currentPlayingIdRef.current = null;
        abortControllerRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: error.message || '语音暂时不可用' });
      }
    }
  }, [state.isPlaying, stop, buildTtsUrl, playAudioFromUrl]);

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
