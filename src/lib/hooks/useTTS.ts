// TTS 语音播放 Hook - 重写版
// 方案：fetch /api/tts 获取完整音频blob → 本地播放
// API直接返回音频二进制，不存在CORS/网络中断问题
// 预加载：AI消息出现时后台下载音频

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
    .replace(/\*\*/g, '')
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

function truncateText(text: string, maxLen = 250): string {
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
  // blob缓存：messageId → blobUrl
  const blobCache = useRef<Map<string, string>>(new Map());
  // 正在下载的Promise
  const loadingPromises = useRef<Map<string, Promise<string | null>>>(new Map());

  // 清理
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      blobCache.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    playingIdRef.current = null;
    setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
  }, []);

  // 下载音频blob
  const downloadBlob = useCallback(async (text: string, messageId: string): Promise<string | null> => {
    // 已缓存
    const cached = blobCache.current.get(messageId);
    if (cached) return cached;

    // 正在下载
    const pending = loadingPromises.current.get(messageId);
    if (pending) return pending;

    const clean = truncateText(cleanText(text), 250);
    if (!clean) return null;

    const params = new URLSearchParams({
      text: clean,
      persona,
      isCompanion: String(isCompanion),
    });

    const promise = (async () => {
      try {
        const res = await fetch(`/api/tts?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: '请求失败' }));
          console.warn('TTS API error:', err.error);
          return null;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('audio')) {
          console.warn('TTS not audio:', contentType);
          return null;
        }

        const blob = await res.blob();
        if (blob.size < 100) return null; // 太小，可能是错误

        const blobUrl = URL.createObjectURL(blob);
        blobCache.current.set(messageId, blobUrl);
        return blobUrl;
      } catch (err) {
        console.warn('TTS download error:', err);
        return null;
      } finally {
        loadingPromises.current.delete(messageId);
      }
    })();

    loadingPromises.current.set(messageId, promise);
    return promise;
  }, [persona, isCompanion]);

  // 预加载（AI消息出现时调用）
  const preload = useCallback((text: string, messageId: string) => {
    downloadBlob(text, messageId);
  }, [downloadBlob]);

  const isPreloaded = useCallback((messageId: string) => {
    return blobCache.current.has(messageId);
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

    const clean = cleanText(text);
    if (!clean) return;

    setState({ isPlaying: false, playingId: messageId, isLoading: true, error: null });
    playingIdRef.current = messageId;

    try {
      const blobUrl = await downloadBlob(text, messageId);

      if (!blobUrl) {
        throw new Error('语音暂时不可用');
      }

      // 被取消了
      if (playingIdRef.current !== messageId) return;

      // 创建Audio并播放blob URL（本地文件，不会中断）
      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        const onEnded = () => {
          cleanup();
          audioRef.current = null;
          playingIdRef.current = null;
          setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
          resolve();
        };

        const onError = () => {
          cleanup();
          reject(new Error('播放失败'));
        };

        const cleanup = () => {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
        audio.play().catch(reject);
      });

    } catch (err: unknown) {
      const error = err as Error;
      if (playingIdRef.current === messageId) {
        audioRef.current = null;
        playingIdRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: error.message });
      }
    }
  }, [state.isPlaying, stop, downloadBlob]);

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
