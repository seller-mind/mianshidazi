// TTS v9 - 串行预加载 + 边取边播 + Audio预缓冲
// 1. 串行预加载（可靠）+ 边取边播（第一段就出声）
// 2. Audio元素预缓冲，缓存命中秒出声
// 3. POST请求，3次重试

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
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) || (code >= 0xF900 && code <= 0xFAFF)) len += 2;
    else len += 1;
  }
  return len;
}

function splitIntoSegments(text: string): string[] {
  if (cosyVoiceLen(text) <= MAX_COSY_CHARS) return [text];
  const segments: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (cosyVoiceLen(remaining) <= MAX_COSY_CHARS) { segments.push(remaining); break; }
    let splitPos = -1, charCount = 0;
    for (let i = 0; i < remaining.length; i++) {
      const code = remaining[i].codePointAt(0)!;
      charCount += ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) ? 2 : 1;
      if (charCount > MAX_COSY_CHARS - 20) {
        for (let j = i; j >= Math.max(0, i - 30); j--) { if ('。！？；'.includes(remaining[j])) { splitPos = j + 1; break; } }
        if (splitPos === -1) { for (let j = i; j >= Math.max(0, i - 30); j--) { if ('，、：'.includes(remaining[j])) { splitPos = j + 1; break; } } }
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

async function fetchSegmentUrl(text: string, persona: string, isCompanion: boolean, maxRetries = 3): Promise<string | null> {
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
      }
    } catch (err) { console.warn('[TTS] fetch error:', err); }
    if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
  }
  return null;
}

export function useTTS(options: UseTTSOptions = {}) {
  const { persona = 'A', isCompanion = false } = options;
  const [state, setState] = useState<TTSState>({ isPlaying: false, playingId: null, isLoading: false, error: null });
  const currentPlayRef = useRef<{ id: string; aborted: boolean } | null>(null);
  const audioCache = useRef<Map<string, HTMLAudioElement[]>>(new Map());
  const preloadingIds = useRef<Set<string>>(new Set());

  useEffect(() => { return () => { if (currentPlayRef.current) currentPlayRef.current.aborted = true; }; }, []);

  const stop = useCallback(() => {
    if (currentPlayRef.current) currentPlayRef.current.aborted = true;
    currentPlayRef.current = null;
    setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
  }, []);

  const preload = useCallback((text: string, messageId: string) => {
    if (audioCache.current.has(messageId) || preloadingIds.current.has(messageId)) return;
    preloadingIds.current.add(messageId);
    (async () => {
      const clean = cleanText(text);
      if (!clean) { preloadingIds.current.delete(messageId); return; }
      const segments = splitIntoSegments(clean);
      console.log(`[TTS] preload ${messageId}: ${segments.length} segments`);
      const audios: HTMLAudioElement[] = [];
      for (let i = 0; i < segments.length; i++) {
        const url = await fetchSegmentUrl(segments[i], persona, isCompanion);
        if (url) {
          const audio = new Audio();
          audio.preload = 'auto';
          audio.src = url;
          audio.load();
          audios.push(audio);
        }
      }
      console.log(`[TTS] preload ${messageId} done: ${audios.length}/${segments.length}`);
      audioCache.current.set(messageId, audios);
      preloadingIds.current.delete(messageId);
    })();
  }, [persona, isCompanion]);

  const isPreloaded = useCallback((messageId: string) => audioCache.current.has(messageId), []);
  const isPreloading = useCallback(() => false, []);

  const playAudioElement = useCallback((audio: HTMLAudioElement): Promise<void> => {
    return new Promise((resolve) => {
      audio.currentTime = 0;
      let audioCtx: AudioContext | null = null;
      try {
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(audio);
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 1.5;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
      } catch { audio.volume = 1.0; }

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        clearTimeout(timer);
        if (audioCtx && audioCtx.state !== 'closed') { try { audioCtx.close(); } catch {} }
        resolve();
      };
      const onEnded = () => done();
      const onError = () => done();
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      const timer = setTimeout(() => { audio.pause(); done(); }, 60000);
      audio.play().catch(() => done());
    });
  }, []);

  const play = useCallback(async (text: string, messageId: string) => {
    if (currentPlayRef.current?.id === messageId && state.isPlaying) { stop(); return; }
    stop();
    const playCtx = { id: messageId, aborted: false };
    currentPlayRef.current = playCtx;

    const clean = cleanText(text);
    if (!clean) return;
    const segments = splitIntoSegments(clean);

    // 缓存命中 → 秒出声
    const cached = audioCache.current.get(messageId);
    if (cached && cached.length > 0) {
      console.log(`[TTS] CACHE HIT → instant play`);
      setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
      for (const audio of cached) {
        if (playCtx.aborted) return;
        await playAudioElement(audio);
        if (playCtx.aborted) return;
      }
      if (!playCtx.aborted) { currentPlayRef.current = null; setState({ isPlaying: false, playingId: null, isLoading: false, error: null }); }
      return;
    }

    // 缓存未命中 → 边取边播
    setState({ isPlaying: true, playingId: messageId, isLoading: true, error: null });
    let nextUrlPromise = fetchSegmentUrl(segments[0], persona, isCompanion);
    const audios: HTMLAudioElement[] = [];

    for (let i = 0; i < segments.length; i++) {
      if (playCtx.aborted) return;
      const url = await nextUrlPromise;
      if (i + 1 < segments.length) nextUrlPromise = fetchSegmentUrl(segments[i + 1], persona, isCompanion);
      if (playCtx.aborted) return;
      if (!url) { console.warn(`[TTS] seg${i} FAILED`); continue; }
      if (i === 0) setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      audios.push(audio);
      await playAudioElement(audio);
      if (playCtx.aborted) return;
    }

    if (audios.length > 0) audioCache.current.set(messageId, audios);
    if (!playCtx.aborted) { currentPlayRef.current = null; setState({ isPlaying: false, playingId: null, isLoading: false, error: null }); }
  }, [state.isPlaying, stop, playAudioElement, persona, isCompanion]);

  const isPlayingMessage = useCallback((messageId: string) => state.playingId === messageId && state.isPlaying, [state.playingId, state.isPlaying]);
  const isLoadingMessage = useCallback((messageId: string) => state.playingId === messageId && state.isLoading, [state.playingId, state.isLoading]);

  return { ...state, play, stop, preload, isPreloaded, isPreloading, isPlayingMessage, isLoadingMessage };
}
