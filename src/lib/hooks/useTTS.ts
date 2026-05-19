// TTS 语音播放 Hook - 分段版
// 核心思路：长文本拆成100字小段 → 并行请求所有段URL → 连续播放
// 预加载在消息完成后立即触发，用户点击时大概率已缓冲好

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

const SEGMENT_LEN = 100; // 每段100字

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

// 按标点分段，每段不超过maxChars
function splitIntoSegments(text: string, maxChars = SEGMENT_LEN): string[] {
  if (text.length <= maxChars) return [text];

  const segments: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      segments.push(remaining);
      break;
    }

    let splitPos = -1;
    for (let i = Math.min(remaining.length - 1, maxChars); i >= Math.max(0, maxChars * 0.4); i--) {
      if ('。！？；'.includes(remaining[i])) {
        splitPos = i + 1;
        break;
      }
    }
    if (splitPos === -1) {
      for (let i = Math.min(remaining.length - 1, maxChars); i >= Math.max(0, maxChars * 0.4); i--) {
        if ('，、'.includes(remaining[i])) {
          splitPos = i + 1;
          break;
        }
      }
    }
    if (splitPos === -1) splitPos = maxChars;

    segments.push(remaining.substring(0, splitPos));
    remaining = remaining.substring(splitPos);
  }

  return segments;
}

// 请求单段音频URL
async function fetchSegmentUrl(text: string, persona: string, isCompanion: boolean): Promise<string | null> {
  try {
    const params = new URLSearchParams({ text, persona, isCompanion: String(isCompanion) });
    const res = await fetch(`/api/tts?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

// 并行请求所有段URL
async function fetchAllSegmentUrls(text: string, persona: string, isCompanion: boolean): Promise<string[]> {
  const clean = cleanText(text);
  if (!clean) return [];

  const segments = splitIntoSegments(clean, SEGMENT_LEN);
  const urls = await Promise.all(
    segments.map(seg => fetchSegmentUrl(seg, persona, isCompanion))
  );
  return urls.filter((u): u is string => u !== null);
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
  // 缓存：messageId → string[]
  const urlCache = useRef<Map<string, string[]>>(new Map());
  // 正在加载的promise
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

  // 获取所有段URL（带缓存）
  const getUrls = useCallback(async (text: string, messageId: string): Promise<string[]> => {
    const cached = urlCache.current.get(messageId);
    if (cached) return cached;

    const pending = loadingPromises.current.get(messageId);
    if (pending) return pending;

    const promise = fetchAllSegmentUrls(text, persona, isCompanion).then(urls => {
      loadingPromises.current.delete(messageId);
      if (urls.length > 0) urlCache.current.set(messageId, urls);
      return urls;
    });
    loadingPromises.current.set(messageId, promise);
    return promise;
  }, [persona, isCompanion]);

  // 预加载
  const preload = useCallback((text: string, messageId: string) => {
    if (urlCache.current.has(messageId) || loadingPromises.current.has(messageId)) return;
    getUrls(text, messageId);
  }, [getUrls]);

  const isPreloaded = useCallback((messageId: string) => {
    return urlCache.current.has(messageId);
  }, []);

  const isPreloading = useCallback(() => false, []);

  // 播放单个Audio
  const playAudio = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;

      const onEnded = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('播放失败')); };
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      audio.play().catch(reject);
    });
  }, []);

  // 播放
  const play = useCallback(async (text: string, messageId: string) => {
    // 点击同一个：停止
    if (currentPlayRef.current?.id === messageId && state.isPlaying) {
      stop();
      return;
    }

    stop();

    setState({ isPlaying: false, playingId: messageId, isLoading: true, error: null });
    const playCtx = { id: messageId, aborted: false };
    currentPlayRef.current = playCtx;

    try {
      const urls = await getUrls(text, messageId);

      if (playCtx.aborted) return;
      if (urls.length === 0) throw new Error('语音暂时不可用');

      setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });

      // 连续播放所有段
      for (const url of urls) {
        if (playCtx.aborted) return;
        await playAudio(url);
        if (playCtx.aborted) return;
      }

      // 全部播完
      if (!playCtx.aborted) {
        currentPlayRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
      }

    } catch (err: unknown) {
      const error = err as Error;
      if (!playCtx.aborted) {
        currentPlayRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: error.message });
      }
    }
  }, [state.isPlaying, stop, getUrls, playAudio]);

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
