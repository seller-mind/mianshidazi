// TTS 语音播放 Hook - 带预加载
// AI消息一出现就在后台生成音频，用户点喇叭时秒出声
// 方案1: 服务端 CosyVoice（阿里云百炼，神经网络语音）
// 方案2: 百度翻译 TTS 兜底

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
    .replace(/\n+/g, '，')
    .trim();
}

function truncateText(text: string, maxLen = 300): string {
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

  // 音频缓存: messageId → blobUrl
  const audioCache = useRef<Map<string, string>>(new Map());
  // 正在预加载的 messageId 集合
  const preloadingSet = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPlayingIdRef = useRef<string | null>(null);

  // 清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      audioCache.current.forEach(url => URL.revokeObjectURL(url));
      audioCache.current.clear();
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    currentPlayingIdRef.current = null;
    setState({
      isPlaying: false,
      playingId: null,
      isLoading: false,
      error: null,
    });
  }, []);

  // 预加载：AI消息一出现就后台生成音频
  const preload = useCallback((text: string, messageId: string) => {
    // 已缓存或正在加载，跳过
    if (audioCache.current.has(messageId) || preloadingSet.current.has(messageId)) return;

    const clean = truncateText(cleanText(text), 300);
    if (!clean) return;

    preloadingSet.current.add(messageId);

    const params = new URLSearchParams({
      text: clean,
      persona,
      isCompanion: String(isCompanion),
    });

    fetch(`/api/tts?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        audioCache.current.set(messageId, blobUrl);
      })
      .catch(err => {
        console.warn('TTS preload failed:', err);
      })
      .finally(() => {
        preloadingSet.current.delete(messageId);
      });
  }, [persona, isCompanion]);

  // 检查是否已预加载完成
  const isPreloaded = useCallback((messageId: string) => {
    return audioCache.current.has(messageId);
  }, []);

  // 检查是否正在预加载
  const isPreloading = useCallback((messageId: string) => {
    return preloadingSet.current.has(messageId);
  }, []);

  // 播放音频
  const playAudioUrl = useCallback((audioUrl: string, messageId: string, timeoutMs = 12000): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      audioRef.current = audio;
      currentPlayingIdRef.current = messageId;

      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) { settled = true; cleanup(); reject(new Error('超时')); }
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };

      const onCanPlay = () => {
        setState({ isPlaying: true, playingId: messageId, isLoading: false, error: null });
        audio.play().catch(e => { if (!settled) { settled = true; cleanup(); reject(e); } });
      };

      const onEnded = () => {
        if (!settled) {
          settled = true; cleanup();
          if (currentPlayingIdRef.current === messageId) {
            audioRef.current = null;
            currentPlayingIdRef.current = null;
            setState({ isPlaying: false, playingId: null, isLoading: false, error: null });
          }
          resolve();
        }
      };

      const onError = () => {
        if (!settled) { settled = true; cleanup(); reject(new Error('播放失败')); }
      };

      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError, { once: true });
      audio.src = audioUrl;
    });
  }, []);

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

    // 检查缓存 → 秒出声！
    const cachedUrl = audioCache.current.get(messageId);
    if (cachedUrl) {
      setState({ isPlaying: false, playingId: messageId, isLoading: true, error: null });
      try {
        await playAudioUrl(cachedUrl, messageId, 3000);
        return;
      } catch {
        // 缓存的 blob 可能失效，清除后重新加载
        URL.revokeObjectURL(cachedUrl);
        audioCache.current.delete(messageId);
      }
    }

    setState({ isPlaying: false, playingId: messageId, isLoading: true, error: null });

    try {
      // 方案1: 服务端 CosyVoice
      const params = new URLSearchParams({
        text: truncateText(clean, 300),
        persona,
        isCompanion: String(isCompanion),
      });
      const response = await fetch(`/api/tts?${params.toString()}`);
      if (!response.ok) throw new Error('服务端TTS失败');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      audioCache.current.set(messageId, blobUrl);
      if (currentPlayingIdRef.current !== messageId) return;
      await playAudioUrl(blobUrl, messageId, 3000);
    } catch (serverError) {
      console.warn('CosyVoice failed:', serverError);
      if (currentPlayingIdRef.current !== messageId) return;

      try {
        // 方案2: 百度 TTS 兜底
        const baiduUrl = `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(truncateText(clean, 200))}&spd=5&source=web`;
        await playAudioUrl(baiduUrl, messageId, 8000);
      } catch {
        if (currentPlayingIdRef.current === messageId) {
          audioRef.current = null;
          currentPlayingIdRef.current = null;
          setState({ isPlaying: false, playingId: null, isLoading: false, error: '语音暂时不可用' });
        }
      }
    }
  }, [persona, isCompanion, state.isPlaying, stop, playAudioUrl]);

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
