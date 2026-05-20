// TTS 语音播放 Hook - v3
// 修复跳读：减少分段数量（300字一段），避免并行请求过多导致API限流丢段

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

const SEGMENT_LEN = 300; // 300字一段，减少分段数量避免限流

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
    .replace(/✅/g, '')
    .replace(/✨/g, '')
    .replace(/👉/g, '')
    .replace(/💡/g, '')
    .replace(/🔥/g, '')
    // 语气词自然化
    .replace(/哎哟[，,！!。？?]/g, '是这样，')
    .replace(/哎呦[，,！!。？?]/g, '嗯，')
    .replace(/哎呀[，,！!。？?]/g, '嗯，')
    .replace(/哟[，,！!。？?]/g, '，')
    .replace(/呵[呵哈]+[，,！!。？?]/g, '，')
    .replace(/嘿[嘿哈]+[，,！!。？?]/g, '，')
    .replace(/嗯嗯+/g, '嗯')
    .replace(/哈哈+/g, '哈哈')
    .replace(/哇[哦噢]+[，,！!。？?]/g, '，')
    .replace(/呃[，,！!。？?]/g, '，')
    .replace(/额[，,！!。？?]/g, '，')
    .replace(/哦[哦噢]+[，,！!。？?]/g, '，')
    .replace(/啊[啊哈]+[，,！!。？?]/g, '，')
    .replace(/^嗯[，,]/, '')
    .replace(/^哦[，,]/, '')
    // 节奏控制：换行→分号（≈400ms停顿）
    .replace(/\n+/g, '；')
    .replace(/；{2,}/g, '；')
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
    for (let i = Math.min(remaining.length - 1, maxChars); i >= Math.max(0, maxChars * 0.3); i--) {
      if ('。！？；'.includes(remaining[i])) {
        splitPos = i + 1;
        break;
      }
    }
    if (splitPos === -1) {
      for (let i = Math.min(remaining.length - 1, maxChars); i >= Math.max(0, maxChars * 0.3); i--) {
        if ('，、：'.includes(remaining[i])) {
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

// 串行请求每段URL（避免并行限流）
async function fetchAllSegmentUrls(text: string, persona: string, isCompanion: boolean): Promise<string[]> {
  const clean = cleanText(text);
  if (!clean) return [];

  const segments = splitIntoSegments(clean, SEGMENT_LEN);
  const urls: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    try {
      const params = new URLSearchParams({ text: segments[i], persona, isCompanion: String(isCompanion) });
      const res = await fetch(`/api/tts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          urls.push(data.url);
          continue;
        }
      }
      // 失败重试一次
      await new Promise(r => setTimeout(r, 500));
      const retryRes = await fetch(`/api/tts?${params.toString()}`);
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        if (retryData.url) {
          urls.push(retryData.url);
          continue;
        }
      }
      // 两次都失败，跳过这段（但不中断后续）
      console.warn(`TTS segment ${i} failed, skipping`);
    } catch {
      console.warn(`TTS segment ${i} error, skipping`);
    }
  }

  return urls;
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

  const preload = useCallback((text: string, messageId: string) => {
    if (urlCache.current.has(messageId) || loadingPromises.current.has(messageId)) return;
    getUrls(text, messageId);
  }, [getUrls]);

  const isPreloaded = useCallback((messageId: string) => {
    return urlCache.current.has(messageId);
  }, []);

  const isPreloading = useCallback(() => false, []);

  // 播放单个Audio（容错）
  const playAudio = useCallback((url: string, timeoutMs = 15000): Promise<void> => {
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
      const onError = () => done();
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        clearTimeout(timer);
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      const timer = setTimeout(() => {
        audio.pause();
        done();
      }, timeoutMs);

      audio.play().catch(() => done());
    });
  }, []);

  const play = useCallback(async (text: string, messageId: string) => {
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

      for (const url of urls) {
        if (playCtx.aborted) return;
        await playAudio(url);
        if (playCtx.aborted) return;
      }

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
