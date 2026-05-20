// TTS v8 - 并行预加载 + 缓存秒播
// 核心思路：
// 1. AI消息一出现就并行预加载所有段URL（用户看文字时后台已取好）
// 2. 用户点喇叭时URL已在缓存，0延迟出声
// 3. 每段独立API请求，不会触发Vercel超时
// 4. 每段2次重试，防丢段

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

// CosyVoice字符限制：200（汉字算2），安全值≤90汉字
const MAX_COSY_CHARS = 180;

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

function cosyVoiceLen(text: string): number {
  let len = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) || (code >= 0xF900 && code <= 0xFAFF)) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}

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
          if ('。！？；'.includes(remaining[j])) { splitPos = j + 1; break; }
        }
        if (splitPos === -1) {
          for (let j = i; j >= Math.max(0, i - 30); j--) {
            if ('，、：'.includes(remaining[j])) { splitPos = j + 1; break; }
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

// 请求单段URL（2次重试，用POST避免URL长度限制）
async function fetchSegmentUrl(
  text: string,
  persona: string,
  isCompanion: boolean,
  maxRetries = 2
): Promise<string | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona, isCompanion }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) return data.url;
        console.warn(`[TTS] no url in response:`, data.error);
      } else {
        console.warn(`[TTS] HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('[TTS] fetch error:', err);
    }
    if (attempt < maxRetries - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
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
  // 缓存：messageId → string[]（按段的URL数组，null表示该段失败）
  const urlCache = useRef<Map<string, (string | null)[]>>(new Map());
  // 预加载进行中的promise
  const preloadPromises = useRef<Map<string, Promise<void>>>(new Map());

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

  // 预加载：消息一出现就并行取所有段URL
  const preload = useCallback((text: string, messageId: string) => {
    // 已缓存或正在加载
    if (urlCache.current.has(messageId) || preloadPromises.current.has(messageId)) return;

    const promise = (async () => {
      const clean = cleanText(text);
      if (!clean) return;

      const segments = splitIntoSegments(clean);
      console.log(`[TTS] preload ${messageId}: ${segments.length} segments`);

      // 并行请求所有段
      const results = await Promise.all(
        segments.map(seg => fetchSegmentUrl(seg, persona, isCompanion))
      );

      const okCount = results.filter(u => u !== null).length;
      console.log(`[TTS] preload ${messageId} done: ${okCount}/${segments.length}`);

      // 存入缓存（保持顺序，null=失败段）
      urlCache.current.set(messageId, results);
      preloadPromises.current.delete(messageId);
    })();

    preloadPromises.current.set(messageId, promise);
  }, [persona, isCompanion]);

  const isPreloaded = useCallback((messageId: string) => {
    return urlCache.current.has(messageId);
  }, []);

  const isPreloading = useCallback(() => false, []);

  // 播放单个音频（Web Audio API增益放大1.5倍）
  const playAudio = useCallback((url: string): Promise<void> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;

      // 用Web Audio API放大音量
      let audioCtx: AudioContext | null = null;
      let source: MediaElementAudioSourceNode | null = null;
      let gainNode: GainNode | null = null;

      try {
        audioCtx = new AudioContext();
        source = audioCtx.createMediaElementSource(audio);
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 1.5; // 音量放大1.5倍
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
      } catch (e) {
        // 降级：直接播放（不放大）
        console.warn('[TTS] Web Audio API not available, playing without boost');
        audio.volume = 1.0;
      }

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve();
      };

      const onEnded = () => done();
      const onError = () => { console.warn('[TTS] audio error'); done(); };
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        clearTimeout(timer);
        // 清理AudioContext
        if (audioCtx && audioCtx.state !== 'closed') {
          try { audioCtx.close(); } catch { /* ignore */ }
        }
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      const timer = setTimeout(() => { audio.pause(); done(); }, 60000);
      audio.play().catch(() => done());
    });
  }, []);

  // 播放
  const play = useCallback(async (text: string, messageId: string) => {
    // 同一条消息再点→停止
    if (currentPlayRef.current?.id === messageId && state.isPlaying) {
      stop();
      return;
    }

    stop();
    const playCtx = { id: messageId, aborted: false };
    currentPlayRef.current = playCtx;

    // 检查缓存
    const cached = urlCache.current.get(messageId);

    if (cached) {
      // 缓存命中 → 秒出声！
      const validUrls = cached.filter((u): u is string => u !== null);
      if (validUrls.length === 0) {
        setState({ isPlaying: false, playingId: null, isLoading: false, error: '语音不可用' });
        return;
      }

      console.log(`[TTS] CACHE HIT → instant play ${validUrls.length} segments`);
      setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });

      for (const url of validUrls) {
        if (playCtx.aborted) return;
        await playAudio(url);
        if (playCtx.aborted) return;
      }

      if (!playCtx.aborted) {
        currentPlayRef.current = null;
        setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
      }
      return;
    }

    // 缓存未命中 → 等预加载完成（通常已在进行中）
    setState({ isPlaying: true, playingId: messageId, isLoading: true, error: null });

    // 确保预加载已启动
    preload(text, messageId);

    // 等预加载完成
    const preloadPromise = preloadPromises.current.get(messageId);
    if (preloadPromise) {
      await preloadPromise;
    }

    if (playCtx.aborted) return;

    const urls = urlCache.current.get(messageId);
    const validUrls = urls?.filter((u): u is string => u !== null) || [];

    if (validUrls.length === 0) {
      currentPlayRef.current = null;
      setState({ isPlaying: false, playingId: null, isLoading: false, error: '语音不可用' });
      return;
    }

    setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });

    for (const url of validUrls) {
      if (playCtx.aborted) return;
      await playAudio(url);
      if (playCtx.aborted) return;
    }

    if (!playCtx.aborted) {
      currentPlayRef.current = null;
      setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
    }
  }, [state.isPlaying, stop, preload, playAudio]);

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
