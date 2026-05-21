// TTS v11 - 极速版
// 核心优化：
// 1. 预加载时机提前到AI流式回复中（不等完全结束）
// 2. 缓存命中时直接play，0延迟
// 3. 预加载结果用Audio元素+canplaythrough确认就绪
// 4. 修复preload竞态：内容hash校验+abort之前请求

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
      _gainNode.gain.value = 3.0;
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
    try { await pipeline.ctx.resume(); } catch { return false; }
  }
  return true;
}

// ---- 获取TTS URL（带AbortController支持） ----
async function fetchSegmentUrl(
  text: string,
  persona: string,
  isCompanion: boolean,
  signal?: AbortSignal,
  maxRetries = 2
): Promise<string | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (signal?.aborted) return null;
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona, isCompanion }),
        signal,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) return data.url;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return null;
      console.warn('[TTS] fetch error:', err);
    }
    if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
  }
  return null;
}

// ---- 缓存条目 ----
interface CacheEntry {
  audios: HTMLAudioElement[];
  hash: string;
  ready: boolean; // 所有Audio元素都canplaythrough了
}

// ---- Hook ----
export function useTTS(options: UseTTSOptions = {}) {
  const { persona = 'A', isCompanion = false } = options;
  const [state, setState] = useState<TTSState>({ isPlaying: false, playingId: null, isLoading: false, error: null });
  const currentPlayRef = useRef<{ id: string; aborted: boolean } | null>(null);
  const audioCache = useRef<Map<string, CacheEntry>>(new Map());
  const preloadingIds = useRef<Map<string, string>>(new Map()); // messageId -> hash
  const abortControllers = useRef<Map<string, AbortController>>(new Map()); // messageId -> abort controller

  useEffect(() => { return () => { if (currentPlayRef.current) currentPlayRef.current.aborted = true; }; }, []);

  const stop = useCallback(() => {
    if (currentPlayRef.current) currentPlayRef.current.aborted = true;
    currentPlayRef.current = null;
    setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
  }, []);

  // 预加载：AI回复过程中就可以调用
  const preload = useCallback((text: string, messageId: string) => {
    const clean = cleanText(text);
    if (!clean) return;
    const hash = contentHash(clean);

    // 已有相同hash的缓存且ready，跳过
    const existing = audioCache.current.get(messageId);
    if (existing && existing.hash === hash && existing.ready) return;

    // 已在预加载中且hash相同，跳过
    const preloadingHash = preloadingIds.current.get(messageId);
    if (preloadingHash === hash) return;

    // 内容变了或首次加载，取消之前的请求
    const prevController = abortControllers.current.get(messageId);
    if (prevController) prevController.abort();

    const controller = new AbortController();
    abortControllers.current.set(messageId, controller);

    // 清除旧缓存
    audioCache.current.delete(messageId);
    preloadingIds.current.set(messageId, hash);

    const segments = splitIntoSegments(clean);

    (async () => {
      const audios: HTMLAudioElement[] = [];
      let allReady = true;

      // 并行加载所有segment的URL
      const urlPromises = segments.map(seg =>
        fetchSegmentUrl(seg, persona, isCompanion, controller.signal)
      );

      const urls = await Promise.all(urlPromises);

      if (controller.signal.aborted) return;

      // 创建Audio元素并等待canplaythrough
      const readyPromises: Promise<void>[] = [];
      for (const url of urls) {
        if (!url) { allReady = false; continue; }
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = url;
        connectAudioElement(audio);

        const readyPromise = new Promise<void>((resolve) => {
          const done = () => {
            audio.removeEventListener('canplaythrough', onReady);
            audio.removeEventListener('error', onError);
            resolve();
          };
          const onReady = () => done();
          const onError = () => { allReady = false; done(); };
          audio.addEventListener('canplaythrough', onReady);
          audio.addEventListener('error', onError);
          // 5秒超时兜底
          setTimeout(done, 5000);
        });
        readyPromises.push(readyPromise);
        audio.load();
        audios.push(audio);
      }

      await Promise.all(readyPromises);

      if (controller.signal.aborted) return;

      // 再次检查hash是否变了
      const currentHash = preloadingIds.current.get(messageId);
      if (currentHash === hash) {
        audioCache.current.set(messageId, { audios, hash, ready: allReady });
        preloadingIds.current.delete(messageId);
        abortControllers.current.delete(messageId);
      }
    })();
  }, [persona, isCompanion]);

  const isPreloaded = useCallback((messageId: string) => {
    const entry = audioCache.current.get(messageId);
    return !!entry && entry.ready;
  }, []);

  // 播放单个Audio元素
  const playAudioElement = useCallback(async (audio: HTMLAudioElement): Promise<void> => {
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

      // 如果音频已就绪直接播放，否则等canplay
      if (audio.readyState >= 3) {
        audio.play().catch(() => done());
      } else {
        const onReady = () => {
          audio.removeEventListener('canplay', onReady);
          audio.removeEventListener('error', onReady);
          audio.play().catch(() => done());
        };
        audio.addEventListener('canplay', onReady);
        audio.addEventListener('error', onReady);
      }
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

    // 缓存命中且就绪 → 秒出声
    const cached = audioCache.current.get(messageId);
    if (cached && cached.hash === hash && cached.audios.length > 0) {
      setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
      for (const audio of cached.audios) {
        if (playCtx.aborted) return;
        await playAudioElement(audio);
        if (playCtx.aborted) return;
      }
      if (!playCtx.aborted) { currentPlayRef.current = null; setState({ isPlaying: false, playingId: null, isLoading: false, error: null }); }
      return;
    }

    // 缓存未命中 → 边取边播（第一个segment用流式代理更快）
    setState({ isPlaying: true, playingId: messageId, isLoading: true, error: null });

    // 并行请求所有segment的URL
    const urlPromises = segments.map(seg =>
      fetchSegmentUrl(seg, persona, isCompanion)
    );

    // 第一个segment先拿到就开始播放
    const firstUrl = await urlPromises[0];
    if (playCtx.aborted) return;

    if (firstUrl) {
      setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
      const firstAudio = new Audio();
      firstAudio.preload = 'auto';
      firstAudio.src = firstUrl;
      connectAudioElement(firstAudio);
      await playAudioElement(firstAudio);
      if (playCtx.aborted) return;

      // 缓存第一个
      const audios = [firstAudio];

      // 播放剩余segments（URL应该已经拿到了因为并行请求）
      for (let i = 1; i < segments.length; i++) {
        if (playCtx.aborted) return;
        const url = await urlPromises[i];
        if (!url) continue;
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
        audioCache.current.set(messageId, { audios, hash, ready: true });
      }
    }

    if (!playCtx.aborted) { currentPlayRef.current = null; setState({ isPlaying: false, playingId: null, isLoading: false, error: null }); }
  }, [state.isPlaying, stop, playAudioElement, persona, isCompanion]);

  const isPlayingMessage = useCallback((messageId: string) => state.playingId === messageId && state.isPlaying, [state.playingId, state.isPlaying]);
  const isLoadingMessage = useCallback((messageId: string) => state.playingId === messageId && state.isLoading, [state.playingId, state.isLoading]);

  return { ...state, play, stop, preload, isPreloaded, isPlayingMessage, isLoadingMessage };
}
