// TTS 语音播放 Hook - URL版
// 流程：fetch /api/tts 获取URL → Audio.src = OSS URL → 浏览器原生播放
// 预加载：消息完成后立即请求URL并预缓冲，用户点击时秒播

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

function truncateText(text: string, maxLen = 200): string {
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
  // 缓存：messageId → { url, audio }
  const cacheRef = useRef<Map<string, { url: string; audio: HTMLAudioElement }>>(new Map());

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      cacheRef.current.forEach(({ audio }) => { audio.pause(); audio.src = ''; });
    };
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    playingIdRef.current = null;
    setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
  }, []);

  // 构建API URL
  const buildApiUrl = useCallback((text: string): string => {
    const clean = truncateText(cleanText(text), 200);
    const params = new URLSearchParams({
      text: clean,
      persona,
      isCompanion: String(isCompanion),
    });
    return `/api/tts?${params.toString()}`;
  }, [persona, isCompanion]);

  // 预加载：请求API获取音频URL → 创建Audio预缓冲
  const preload = useCallback((text: string, messageId: string) => {
    const apiUrl = buildApiUrl(text);
    const existing = cacheRef.current.get(messageId);

    // URL未变，不需要重新加载
    if (existing && existing.url === apiUrl) return;

    // 请求API获取音频URL
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (!data.url) return;

        const ossUrl = data.url;
        // 创建Audio元素预缓冲
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = ossUrl;
        cacheRef.current.set(messageId, { url: apiUrl, audio });
      })
      .catch(() => { /* 预加载失败，不影响后续播放 */ });
  }, [buildApiUrl]);

  const isPreloaded = useCallback((messageId: string) => {
    return cacheRef.current.has(messageId);
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

    try {
      let audio: HTMLAudioElement;
      const cached = cacheRef.current.get(messageId);

      if (cached) {
        audio = cached.audio;
      } else {
        // 没有缓存，实时请求
        setState({ isPlaying: false, playingId: messageId, isLoading: true, error: null });

        const apiUrl = buildApiUrl(text);
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (data.error) throw new Error(data.error);
        if (!data.url) throw new Error('未获取到音频');

        audio = new Audio();
        audio.preload = 'auto';
        audio.src = data.url;
        cacheRef.current.set(messageId, { url: apiUrl, audio });
      }

      // 被取消了
      if (playingIdRef.current !== messageId) return;

      audioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const onPlaying = () => {
          if (settled) return;
          setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
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
          reject(new Error('播放失败'));
        };

        const cleanup = () => {
          audio.removeEventListener('playing', onPlaying);
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
        };

        audio.addEventListener('playing', onPlaying, { once: true });
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError, { once: true });

        // 如果已经在播放或暂停中（预加载好的）
        if (!audio.paused && !audio.ended) {
          // 正在播放，直接标记
          setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
        } else {
          // 从头播放
          audio.currentTime = 0;
          audio.play().catch(reject);
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
  }, [state.isPlaying, stop, buildApiUrl]);

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
