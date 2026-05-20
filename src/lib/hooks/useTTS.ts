// TTS 语音播放 Hook - v5.1 边取边播 + 并行预加载
// 核心改进：
// 1. 并行预加载所有段URL（不再串行等待）
// 2. 播放时第一段URL拿到就出声（1-2秒）
// 3. 播放当前段时预取下一段，无缝衔接
// 4. 每段3次重试，减少丢句
// 5. 播放超时60秒，防止长段被截断

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

// CosyVoice限制：200字符（汉字算2），留余量每段≤180字符
const MAX_COSY_CHARS = 180;

function cleanText(text: string): string {
  return text
    // 去掉所有括号内容（圆括号、方括号中的舞台指示/心理描写）
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[[\【][^】\]]*[】\]]/g, '')
    // 去emoji
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2702}-\u{27B0}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    // 去特殊符号
    .replace(/✅/g, '')
    .replace(/✨/g, '')
    .replace(/👉/g, '')
    .replace(/💡/g, '')
    .replace(/🔥/g, '')
    .replace(/☕/g, '')
    .replace(/🌙/g, '')
    .replace(/😅/g, '')
    // Markdown
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[「」『』]/g, '')
    .replace(/[～~]/g, '，')
    .replace(/→/g, '到')
    .replace(/—+/g, '——')
    // 语气词：不再替换，让TTS原样读
    // 之前的替换导致"哎哟"→"是这样"，读出来完全不对
    // 节奏：换行→分号
    .replace(/\n+/g, '；')
    .replace(/；{2,}/g, '；')
    .replace(/。{2,}/g, '。')
    .replace(/，{2,}/g, '，')
    .trim();
}

// 计算CosyVoice字符数（汉字算2）
function cosyVoiceLen(text: string): number {
  let len = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x4E00 && code <= 0x9FFF) ||
        (code >= 0x3400 && code <= 0x4DBF) ||
        (code >= 0xF900 && code <= 0xFAFF)) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}

// 按CosyVoice字符限制分段（每段≤180字符）
function splitIntoSegments(text: string): string[] {
  if (cosyVoiceLen(text) <= MAX_COSY_CHARS) return [text];

  const segments: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (cosyVoiceLen(remaining) <= MAX_COSY_CHARS) {
      segments.push(remaining);
      break;
    }

    let splitPos = -1;
    let charCount = 0;

    for (let i = 0; i < remaining.length; i++) {
      const code = remaining[i].codePointAt(0)!;
      charCount += ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) ? 2 : 1;

      if (charCount > MAX_COSY_CHARS - 20) {
        for (let j = i; j >= Math.max(0, i - 30); j--) {
          if ('。！？；'.includes(remaining[j])) {
            splitPos = j + 1;
            break;
          }
        }
        if (splitPos === -1) {
          for (let j = i; j >= Math.max(0, i - 30); j--) {
            if ('，、：'.includes(remaining[j])) {
              splitPos = j + 1;
              break;
            }
          }
        }
        if (splitPos === -1) splitPos = i;
        break;
      }
    }

    if (splitPos <= 0) splitPos = remaining.length;
    segments.push(remaining.substring(0, splitPos));
    remaining = remaining.substring(splitPos);
  }

  return segments;
}

// 请求单段URL，3次重试
async function fetchSegmentUrl(
  text: string,
  persona: string,
  isCompanion: boolean,
  segIndex: number,
  maxRetries = 3
): Promise<string | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const params = new URLSearchParams({ text, persona, isCompanion: String(isCompanion) });
      const res = await fetch(`/api/tts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          console.log(`[TTS] seg${segIndex} OK (attempt ${attempt + 1})`);
          return data.url;
        }
        console.warn(`[TTS] seg${segIndex} no url:`, data.error);
      } else {
        console.warn(`[TTS] seg${segIndex} HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`[TTS] seg${segIndex} error:`, err);
    }

    if (attempt < maxRetries - 1) {
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }
  }

  console.error(`[TTS] seg${segIndex} FAILED after ${maxRetries} retries`);
  return null;
}

// 并行预取所有段URL
async function prefetchAllSegmentUrls(text: string, persona: string, isCompanion: boolean): Promise<string[]> {
  const clean = cleanText(text);
  if (!clean) return [];

  const segments = splitIntoSegments(clean);
  console.log(`[TTS preload] ${segments.length} segments (parallel)`);

  // 并行请求所有段
  const urlPromises = segments.map((seg, i) => fetchSegmentUrl(seg, persona, isCompanion, i));
  const results = await Promise.all(urlPromises);

  const validCount = results.filter(u => u).length;
  console.log(`[TTS preload] done: ${validCount}/${segments.length} OK`);
  return results as string[];
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

    const promise = prefetchAllSegmentUrls(text, persona, isCompanion).then(urls => {
      loadingPromises.current.delete(messageId);
      const validUrls = urls.filter(u => u);
      if (validUrls.length > 0) urlCache.current.set(messageId, validUrls);
      return validUrls;
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

  // 播放单个音频URL，60秒超时
  const playAudio = useCallback((url: string, timeoutMs = 60000): Promise<void> => {
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
        console.warn('[TTS] audio playback error');
        done();
      };
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        clearTimeout(timer);
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      const timer = setTimeout(() => {
        console.warn('[TTS] audio timeout after', timeoutMs);
        audio.pause();
        done();
      }, timeoutMs);

      audio.play().catch(() => done());
    });
  }, []);

  // 核心播放：边取边播
  const play = useCallback(async (text: string, messageId: string) => {
    // 点击同一条消息 → 停止
    if (currentPlayRef.current?.id === messageId && state.isPlaying) {
      stop();
      return;
    }

    stop();
    const playCtx = { id: messageId, aborted: false };
    currentPlayRef.current = playCtx;
    setState({ isPlaying: false, playingId: messageId, isLoading: true, error: null });

    const clean = cleanText(text);
    if (!clean) {
      setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
      return;
    }

    const segments = splitIntoSegments(clean);
    console.log(`[TTS] play: ${segments.length} segments, total ${cosyVoiceLen(clean)} chars`);

    // 检查是否已缓存
    const cached = urlCache.current.get(messageId);
    if (cached && cached.length > 0) {
      console.log(`[TTS] using ${cached.length} cached URLs → instant play`);
      if (playCtx.aborted) return;
      setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });

      for (const url of cached) {
        if (playCtx.aborted) return;
        if (!url) continue;
        await playAudio(url);
        if (playCtx.aborted) return;
      }

      if (!playCtx.aborted) {
        currentPlayRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
      }
      return;
    }

    // 未缓存 → 边取边播
    // 立即请求第一段URL
    let nextUrlPromise = fetchSegmentUrl(segments[0], persona, isCompanion, 0);
    let failedCount = 0;

    for (let i = 0; i < segments.length; i++) {
      if (playCtx.aborted) return;

      // 等待当前段URL
      const url = await nextUrlPromise;

      // 立即开始请求下一段（不等待当前段播完）
      if (i + 1 < segments.length) {
        nextUrlPromise = fetchSegmentUrl(segments[i + 1], persona, isCompanion, i + 1);
      }

      if (playCtx.aborted) return;

      if (!url) {
        failedCount++;
        console.warn(`[TTS] seg${i} skipped (no URL)`);
        continue;
      }

      // 第一段就出声
      if (i === 0) {
        setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
      }

      await playAudio(url);
      if (playCtx.aborted) return;
    }

    if (failedCount > 0) {
      console.warn(`[TTS] ${failedCount}/${segments.length} segments failed`);
    }

    if (!playCtx.aborted) {
      currentPlayRef.current = null;
      setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
    }
  }, [state.isPlaying, stop, getUrls, playAudio, persona, isCompanion]);

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
