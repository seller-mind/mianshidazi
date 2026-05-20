// TTS v7 - CosyVoice服务端并行合成 + 客户端顺序播放
// 核心改动：服务端一次返回所有段URL，客户端只需一个请求
// 优点：不会丢段、不会跳读、客户端逻辑极简

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
    .replace(/[[\【][^】\]]*[】\]]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/✅✨👉💡🔥☕😅🌙/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/[～~]/g, '，')
    .replace(/→/g, '到')
    .replace(/—+/g, '——')
    .replace(/\n+/g, '；')
    .replace(/；{2,}/g, '；')
    .replace(/。{2,}/g, '。')
    .replace(/，{2,}/g, '，')
    .trim();
}

export function useTTS(options: UseTTSOptions = {}) {
  const { persona = 'A', isCompanion = false } = options;

  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    playingId: null,
    isLoading: false,
    error: null,
  });

  const currentPlayRef = useRef<{ id: string; aborted: boolean } | null>(null);
  const urlCache = useRef<Map<string, string[]>>(new Map());
  const loadingPromises = useRef<Map<string, Promise<string[]>>>(new Map());

  useEffect(() => {
    return () => {
      if (currentPlayRef.current) currentPlayRef.current.aborted = true;
    };
  }, []);

  const stop = useCallback(() => {
    if (currentPlayRef.current) currentPlayRef.current.aborted = true;
    currentPlayRef.current = null;
    setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
  }, []);

  // 请求TTS：一次拿全部URL
  const fetchUrls = useCallback(async (text: string, messageId: string): Promise<string[]> => {
    // 检查缓存
    const cached = urlCache.current.get(messageId);
    if (cached) return cached;

    // 检查进行中的请求
    const pending = loadingPromises.current.get(messageId);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const clean = cleanText(text);
        if (!clean) return [];

        const params = new URLSearchParams({
          text: clean,
          persona,
          isCompanion: String(isCompanion),
        });

        const res = await fetch(`/api/tts?${params.toString()}`);
        if (!res.ok) {
          console.error('[TTS] API error:', res.status);
          return [];
        }

        const data = await res.json();
        const urls: string[] = data.urls || [];

        if (urls.length > 0) {
          urlCache.current.set(messageId, urls);
        }

        console.log(`[TTS] got ${urls.length} audio URLs for ${messageId}`);
        return urls;
      } catch (err) {
        console.error('[TTS] fetch error:', err);
        return [];
      } finally {
        loadingPromises.current.delete(messageId);
      }
    })();

    loadingPromises.current.set(messageId, promise);
    return promise;
  }, [persona, isCompanion]);

  // 预加载
  const preload = useCallback((text: string, messageId: string) => {
    if (urlCache.current.has(messageId) || loadingPromises.current.has(messageId)) return;
    fetchUrls(text, messageId);
  }, [fetchUrls]);

  const isPreloaded = useCallback((messageId: string) => {
    return urlCache.current.has(messageId);
  }, []);

  const isPreloading = useCallback(() => false, []);

  // 播放单个音频
  const playAudio = useCallback((url: string): Promise<void> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve();
      };

      const onEnded = () => done();
      const onError = () => {
        console.warn('[TTS] audio error');
        done();
      };
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        clearTimeout(timer);
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      // 单段最长60秒
      const timer = setTimeout(() => {
        console.warn('[TTS] segment timeout 60s');
        audio.pause();
        done();
      }, 60000);

      audio.play().catch(() => done());
    });
  }, []);

  // 播放：拿到URL就出声
  const play = useCallback(async (text: string, messageId: string) => {
    // 同一条消息再点→停止
    if (currentPlayRef.current?.id === messageId && state.isPlaying) {
      stop();
      return;
    }

    stop();
    const playCtx = { id: messageId, aborted: false };
    currentPlayRef.current = playCtx;
    setState({ isPlaying: false, playingId: messageId, isLoading: true, error: null });

    try {
      const urls = await fetchUrls(text, messageId);

      if (playCtx.aborted) return;
      if (urls.length === 0) {
        setState({ isPlaying: false, playingId: null, isLoading: false, error: '语音不可用' });
        currentPlayRef.current = null;
        return;
      }

      // 开始播放
      setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });

      for (const url of urls) {
        if (playCtx.aborted) return;
        await playAudio(url);
        if (playCtx.aborted) return;
      }

      // 播放完毕
      if (!playCtx.aborted) {
        currentPlayRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
      }
    } catch (err) {
      if (!playCtx.aborted) {
        currentPlayRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: '播放失败' });
      }
    }
  }, [state.isPlaying, stop, fetchUrls, playAudio]);

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
