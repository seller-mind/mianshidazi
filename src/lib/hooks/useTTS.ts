// TTS v10 - 全量重写
// 修复:
// 1. AudioContext在移动WebView中suspended → 持久化AudioContext + resume
// 2. SSE流式preload竞态 → 内容hash校验，过期缓存自动失效
// 3. Audio元素连接管理 → 每个元素只connect一次
// 4. 播放前等音频就绪 → canplay事件

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

// ---- 文本处理 ----
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

// 简单内容hash（用于检测SSE流式内容变化）
function contentHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

// ---- 持久化AudioContext管理 ----
let _audioCtx: AudioContext | null = null;
let _gainNode: GainNode | null = null;
const _connectedElements = new WeakSet<HTMLAudioElement>();

function getAudioPipeline(): { ctx: AudioContext; gain: GainNode } | null {
  try {
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new AudioContext();
      _gainNode = _audioCtx.createGain();
      _gainNode.gain.value = 1.5;
      _gainNode.connect(_audioCtx.destination);
    }
    return { ctx: _audioCtx, gain: _gainNode! };
  } catch {
    return null;
  }
}

function connectAudioElement(audio: HTMLAudioElement): boolean {
  const pipeline = getAudioPipeline();
  if (!pipeline) return false;
  if (_connectedElements.has(audio)) return true;
  try {
    const source = pipeline.ctx.createMediaElementSource(audio);
    source.connect(pipeline.gain);
    _connectedElements.add(audio);
    return true;
  } catch {
    return false;
  }
}

async function resumeAudioContext(): Promise<boolean> {
  const pipeline = getAudioPipeline();
  if (!pipeline) return false;
  if (pipeline.ctx.state === 'suspended') {
    try {
      await pipeline.ctx.resume();
    } catch {
      return false;
    }
  }
  return true;
}

// ---- 等待音频就绪 ----
function waitForAudioReady(audio: HTMLAudioElement, timeout = 8000): Promise<void> {
  return new Promise((resolve) => {
    if (audio.readyState >= 3) { resolve(); return; }
    const done = () => { cleanup(); resolve(); };
    const cleanup = () => {
      audio.removeEventListener('canplay', done);
      audio.removeEventListener('canplaythrough', done);
      audio.removeEventListener('error', done);
      clearTimeout(timer);
    };
    const timer = setTimeout(() => { cleanup(); resolve(); }, timeout);
    audio.addEventListener('canplay', done);
    audio.addEventListener('canplaythrough', done);
    audio.addEventListener('error', done);
  });
}

// ---- 获取TTS URL ----
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

// ---- 缓存条目（带内容hash） ----
interface CacheEntry {
  audios: HTMLAudioElement[];
  hash: string; // 内容hash，用于检测SSE流式内容变化
}

// ---- Hook ----
export function useTTS(options: UseTTSOptions = {}) {
  const { persona = 'A', isCompanion = false } = options;
  const [state, setState] = useState<TTSState>({ isPlaying: false, playingId: null, isLoading: false, error: null });
  const currentPlayRef = useRef<{ id: string; aborted: boolean } | null>(null);
  const audioCache = useRef<Map<string, CacheEntry>>(new Map());
  const preloadingIds = useRef<Map<string, string>>(new Map()); // messageId -> hash

  useEffect(() => { return () => { if (currentPlayRef.current) currentPlayRef.current.aborted = true; }; }, []);

  const stop = useCallback(() => {
    if (currentPlayRef.current) currentPlayRef.current.aborted = true;
    currentPlayRef.current = null;
    setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
  }, []);

  // 预加载：仅对最终内容调用
  // 如果内容hash与已有缓存不同，会清除旧缓存重新加载
  const preload = useCallback((text: string, messageId: string) => {
    const clean = cleanText(text);
    if (!clean) return;
    const hash = contentHash(clean);

    // 已有相同hash的缓存，跳过
    const existing = audioCache.current.get(messageId);
    if (existing && existing.hash === hash) return;

    // 已在预加载中且hash相同，跳过
    const preloadingHash = preloadingIds.current.get(messageId);
    if (preloadingHash === hash) return;

    // 内容变了，清除旧缓存和旧的预加载标记
    audioCache.current.delete(messageId);
    preloadingIds.current.set(messageId, hash);

    const segments = splitIntoSegments(clean);
    console.log(`[TTS] preload ${messageId} (${hash}): ${segments.length} segments`);

    (async () => {
      const audios: HTMLAudioElement[] = [];
      for (let i = 0; i < segments.length; i++) {
        const url = await fetchSegmentUrl(segments[i], persona, isCompanion);
        if (url) {
          const audio = new Audio();
          audio.preload = 'auto';
          audio.src = url;
          connectAudioElement(audio);
          audio.load();
          audios.push(audio);
        }
      }
      console.log(`[TTS] preload ${messageId} done: ${audios.length}/${segments.length}`);

      // 再次检查hash是否变了（防止预加载期间内容又变了）
      const currentHash = preloadingIds.current.get(messageId);
      if (currentHash === hash) {
        audioCache.current.set(messageId, { audios, hash });
        preloadingIds.current.delete(messageId);
      } else {
        // 内容已变，丢弃本次结果，下次effect会重新触发
        console.log(`[TTS] preload ${messageId} stale (hash changed), discarding`);
      }
    })();
  }, [persona, isCompanion]);

  const isPreloaded = useCallback((messageId: string) => audioCache.current.has(messageId), []);

  // 播放单个Audio元素
  const playAudioElement = useCallback(async (audio: HTMLAudioElement): Promise<void> => {
    // 确保AudioContext已恢复（移动WebView关键）
    await resumeAudioContext();

    return new Promise((resolve) => {
      audio.currentTime = 0;
      connectAudioElement(audio);

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        clearTimeout(timer);
        resolve();
      };
      const onEnded = () => done();
      const onError = () => done();
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      const timer = setTimeout(() => { audio.pause(); done(); }, 60000);

      // 等音频就绪再播放
      waitForAudioReady(audio).then(() => {
        audio.play().catch(() => done());
      });
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
    const hash = contentHash(clean);

    // 缓存命中（hash也要匹配）→ 秒出声
    const cached = audioCache.current.get(messageId);
    if (cached && cached.hash === hash && cached.audios.length > 0) {
      console.log(`[TTS] CACHE HIT (${hash}) → instant play`);
      setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
      for (const audio of cached.audios) {
        if (playCtx.aborted) return;
        await playAudioElement(audio);
        if (playCtx.aborted) return;
      }
      if (!playCtx.aborted) { currentPlayRef.current = null; setState({ isPlaying: false, playingId: null, isLoading: false, error: null }); }
      return;
    }

    // 缓存未命中或hash不匹配 → 边取边播
    console.log(`[TTS] CACHE MISS (${hash}) → fetch and play, ${segments.length} segments`);
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
      connectAudioElement(audio);
      audios.push(audio);
      await playAudioElement(audio);
      if (playCtx.aborted) return;
    }

    // 缓存结果
    if (audios.length > 0) {
      audioCache.current.set(messageId, { audios, hash });
    }
    if (!playCtx.aborted) { currentPlayRef.current = null; setState({ isPlaying: false, playingId: null, isLoading: false, error: null }); }
  }, [state.isPlaying, stop, playAudioElement, persona, isCompanion]);

  const isPlayingMessage = useCallback((messageId: string) => state.playingId === messageId && state.isPlaying, [state.playingId, state.isPlaying]);
  const isLoadingMessage = useCallback((messageId: string) => state.playingId === messageId && state.isLoading, [state.playingId, state.isLoading]);

  return { ...state, play, stop, preload, isPreloaded, isPlayingMessage, isLoadingMessage };
}
