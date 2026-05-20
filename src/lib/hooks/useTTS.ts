// TTS 语音播放 Hook - v4 重写
// 核心修复：CosyVoice非流式API单次限制200字符（汉字算2字符，约100汉字）
// 所以分段必须≤100汉字，且必须确认每段完整播放

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

// CosyVoice限制：200字符（汉字算2），所以最多约90个汉字+标点
const MAX_CHARS_PER_SEGMENT = 90;

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
    // 语气词
    .replace(/哎哟[，,！!。？?～]/g, '是这样，')
    .replace(/哎呦[，,！!。？?～]/g, '嗯，')
    .replace(/哎呀[，,！!。？?～]/g, '嗯，')
    .replace(/哟[，,！!。？?～]/g, '，')
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
    // CJK统一汉字范围
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

// 按CosyVoice字符限制分段（每段≤190字符，留10字符余量）
function splitIntoSegments(text: string): string[] {
  if (cosyVoiceLen(text) <= 190) return [text];

  const segments: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (cosyVoiceLen(remaining) <= 190) {
      segments.push(remaining);
      break;
    }

    // 找到不超过190字符的分割点
    let splitPos = -1;
    let charCount = 0;

    for (let i = 0; i < remaining.length; i++) {
      const ch = remaining[i];
      const code = ch.codePointAt(0)!;
      charCount += ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) ? 2 : 1;

      if (charCount > 180) { // 留余量
        // 从当前位置往前找标点
        for (let j = i; j >= Math.max(0, i - 30); j--) {
          if ('。！？；'.includes(remaining[j])) {
            splitPos = j + 1;
            break;
          }
        }
        if (splitPos === -1) {
          for (let j = i; j >= Math.max(0, i - 30); j--) {
            if ('，、：——'.includes(remaining[j])) {
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

// 串行请求每段URL
async function fetchAllSegmentUrls(text: string, persona: string, isCompanion: boolean): Promise<string[]> {
  const clean = cleanText(text);
  if (!clean) return [];

  const segments = splitIntoSegments(clean);
  console.log(`[TTS] split into ${segments.length} segments, lengths:`, segments.map(s => `${s.length}字/${cosyVoiceLen(s)}字符`));

  const urls: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    try {
      const params = new URLSearchParams({ text: seg, persona, isCompanion: String(isCompanion) });
      const res = await fetch(`/api/tts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          urls.push(data.url);
          console.log(`[TTS] segment ${i} OK`);
          continue;
        }
        console.warn(`[TTS] segment ${i} no url:`, data.error);
      } else {
        console.warn(`[TTS] segment ${i} HTTP ${res.status}`);
      }
      // 重试
      await new Promise(r => setTimeout(r, 500));
      const retryRes = await fetch(`/api/tts?${params.toString()}`);
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        if (retryData.url) {
          urls.push(retryData.url);
          console.log(`[TTS] segment ${i} retry OK`);
          continue;
        }
      }
      console.warn(`[TTS] segment ${i} failed after retry, SKIPPING`);
    } catch (err) {
      console.warn(`[TTS] segment ${i} error:`, err);
    }
  }

  console.log(`[TTS] got ${urls.length}/${segments.length} segment URLs`);
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
