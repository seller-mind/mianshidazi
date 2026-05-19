// TTS 语音播放 Hook
// 方案：fetch /api/tts 获取音频URL → 下载完整音频为blob → 播放blob URL
// 好处：本地播放不依赖网络，不会中断
// 预加载：AI消息出现时立即后台下载音频

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
  // 预加载缓存: messageId → blobUrl
  const preloadedBlobs = useRef<Map<string, string>>(new Map());
  // 预加载中的Promise
  const preloadingPromises = useRef<Map<string, Promise<string | null>>>(new Map());

  // 清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      preloadedBlobs.current.forEach(url => URL.revokeObjectURL(url));
      preloadedBlobs.current.clear();
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

  // 获取音频blob URL：请求API拿到音频URL → 下载音频 → 转blob URL
  const fetchAudioBlob = useCallback(async (text: string): Promise<string | null> => {
    try {
      // 1. 请求API获取音频URL
      const apiResponse = await fetch(buildTtsUrl(text));
      if (!apiResponse.ok) return null;

      const data = await apiResponse.json();
      if (data.error || !data.url) return null;

      // 2. 下载完整音频文件
      const audioResponse = await fetch(data.url);
      if (!audioResponse.ok) return null;

      const blob = await audioResponse.blob();
      if (blob.size === 0) return null;

      // 3. 创建本地blob URL
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }, [buildTtsUrl]);

  // 预加载
  const preload = useCallback((text: string, messageId: string) => {
    if (preloadedBlobs.current.has(messageId)) return;
    if (preloadingPromises.current.has(messageId)) return;

    const clean = truncateText(cleanText(text), 500);
    if (!clean) return;

    const promise = fetchAudioBlob(text).then(blobUrl => {
      preloadingPromises.current.delete(messageId);
      if (blobUrl) {
        preloadedBlobs.current.set(messageId, blobUrl);
      }
      return blobUrl;
    });

    preloadingPromises.current.set(messageId, promise);
  }, [fetchAudioBlob]);

  const isPreloaded = useCallback((messageId: string) => {
    return preloadedBlobs.current.has(messageId);
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
      let blobUrl: string | null = null;

      // 1. 检查预加载缓存
      blobUrl = preloadedBlobs.current.get(messageId) || null;

      // 2. 检查正在预加载的Promise
      if (!blobUrl) {
        const pending = preloadingPromises.current.get(messageId);
        if (pending) {
          blobUrl = await pending;
        }
      }

      // 3. 都没有，直接请求下载
      if (!blobUrl) {
        blobUrl = await fetchAudioBlob(text);
      }

      if (!blobUrl) {
        throw new Error('语音暂时不可用');
      }

      // 缓存
      preloadedBlobs.current.set(messageId, blobUrl);

      // 被取消了
      if (currentPlayingIdRef.current !== messageId) {
        return;
      }

      // 播放本地blob URL - 不会因为网络中断
      const audio = new Audio(blobUrl);
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

        // blob URL是本地的，几乎瞬间canplay
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
        }, 10000);
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
  }, [state.isPlaying, stop, fetchAudioBlob]);

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
