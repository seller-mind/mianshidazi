// TTS 语音播放 Hook
// 方案：fetch /api/tts 获取音频URL → Audio 直接播放
// 预加载：AI消息出现时立即后台请求URL并预缓冲音频

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
    .replace(/[（(][^）)]*[）)]/g, '')
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

function truncateText(text: string, maxLen = 500): string {
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
  // 预加载缓存: messageId → audioUrl
  const preloadedUrls = useRef<Map<string, string>>(new Map());
  // 预加载中的Promise: messageId → Promise
  const preloadingPromises = useRef<Map<string, Promise<string | null>>>(new Map());

  // 清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      preloadedUrls.current.clear();
      preloadingPromises.current.clear();
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    currentPlayingIdRef.current = null;
    setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
  }, []);

  // 构建 /api/tts 的URL
  const buildTtsUrl = useCallback((text: string): string => {
    const params = new URLSearchParams({
      text: truncateText(cleanText(text), 500),
      persona,
      isCompanion: String(isCompanion),
    });
    return `/api/tts?${params.toString()}`;
  }, [persona, isCompanion]);

  // 请求TTS API获取音频URL
  const fetchAudioUrl = useCallback(async (text: string): Promise<string | null> => {
    try {
      const response = await fetch(buildTtsUrl(text));
      if (!response.ok) return null;

      const data = await response.json();
      if (data.error) return null;
      return data.url || null;
    } catch {
      return null;
    }
  }, [buildTtsUrl]);

  // 预加载：AI消息出现时立即请求URL + 预缓冲音频
  const preload = useCallback((text: string, messageId: string) => {
    if (preloadedUrls.current.has(messageId)) return;
    if (preloadingPromises.current.has(messageId)) return;

    const clean = truncateText(cleanText(text), 500);
    if (!clean) return;

    const promise = fetchAudioUrl(text).then(url => {
      preloadingPromises.current.delete(messageId);
      if (url) {
        preloadedUrls.current.set(messageId, url);
        // 预缓冲音频文件
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.load();
      }
      return url;
    });

    preloadingPromises.current.set(messageId, promise);
  }, [fetchAudioUrl]);

  const isPreloaded = useCallback((messageId: string) => {
    return preloadedUrls.current.has(messageId);
  }, []);

  const isPreloading = useCallback(() => false, []);

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
    currentPlayingIdRef.current = messageId;

    try {
      let audioUrl: string | null = null;

      // 1. 检查预加载缓存
      audioUrl = preloadedUrls.current.get(messageId) || null;

      // 2. 检查正在预加载的Promise
      if (!audioUrl) {
        const pending = preloadingPromises.current.get(messageId);
        if (pending) {
          audioUrl = await pending;
        }
      }

      // 3. 都没有，直接请求
      if (!audioUrl) {
        audioUrl = await fetchAudioUrl(text);
      }

      if (!audioUrl) {
        throw new Error('语音暂时不可用');
      }

      // 缓存
      preloadedUrls.current.set(messageId, audioUrl);

      // 播放
      if (currentPlayingIdRef.current !== messageId) return; // 已被取消

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const onCanPlay = () => {
          if (settled) return;
          setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
          audio.play().catch(err => {
            if (!settled) { settled = true; cleanup(); reject(err); }
          });
        };

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

        // 15秒超时
        setTimeout(() => {
          if (!settled) {
            settled = true;
            cleanup();
            reject(new Error('音频加载超时'));
          }
        }, 15000);
      });

    } catch (err: unknown) {
      const error = err as Error;
      console.warn('TTS play failed:', error.message);
      if (currentPlayingIdRef.current === messageId) {
        audioRef.current = null;
        currentPlayingIdRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: error.message || '语音暂时不可用' });
      }
    }
  }, [state.isPlaying, stop, fetchAudioUrl]);

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
