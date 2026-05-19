// TTS 语音播放 Hook - 纯服务端方案
// 不使用浏览器原生 Speech API（WebView 中不可靠）
// 策略：服务端 edge-tts → Google Translate TTS 兜底
// 播放方式：DOM <audio> 元素（最兼容）

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

// 清理文本
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

// 截断文本
function truncateText(text: string, maxLen = 120): string {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastPunc = Math.max(
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('，'),
    truncated.lastIndexOf('！'),
    truncated.lastIndexOf('？'),
    truncated.lastIndexOf('；')
  );
  if (lastPunc > maxLen * 0.5) {
    return text.substring(0, lastPunc + 1);
  }
  return truncated + '…';
}

// 构建服务端 TTS URL（GET 请求，可直接用于 <audio src="">）
function buildServerTTSUrl(text: string, persona: string, isCompanion: boolean): string {
  const params = new URLSearchParams({
    text: truncateText(cleanText(text), 120),
    persona,
    isCompanion: String(isCompanion),
  });
  return `/api/tts?${params.toString()}`;
}

// 构建 Google Translate TTS URL（兜底方案，无需服务端）
function buildGoogleTTSUrl(text: string): string {
  const clean = truncateText(cleanText(text), 200);
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=${encodeURIComponent(clean)}`;
}

export function useTTS(options: UseTTSOptions = {}) {
  const { persona = 'A', isCompanion = false } = options;

  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    playingId: null,
    isLoading: false,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPlayingIdRef = useRef<string | null>(null);

  // 清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        audioRef.current = null;
      }
      currentPlayingIdRef.current = null;
    };
  }, []);

  // 停止播放
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

  // 播放指定 URL 的音频
  const playAudioUrl = useCallback((audioUrl: string, messageId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 清理之前的音频
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }

      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
      currentPlayingIdRef.current = messageId;

      const cleanup = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('ended', onEnded);
      };

      const onCanPlay = () => {
        setState({
          isPlaying: true,
          playingId: messageId,
          isLoading: false,
          error: null,
        });
        audio.play().catch((e) => {
          cleanup();
          reject(e);
        });
      };

      const onError = () => {
        cleanup();
        reject(new Error('音频加载失败'));
      };

      const onEnded = () => {
        cleanup();
        if (currentPlayingIdRef.current === messageId) {
          audioRef.current = null;
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: null,
          });
        }
        resolve();
      };

      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.addEventListener('ended', onEnded, { once: true });

      // 设置超时：5秒内无法播放则放弃
      const timeout = setTimeout(() => {
        cleanup();
        if (currentPlayingIdRef.current === messageId) {
          audio.pause();
          audioRef.current = null;
          currentPlayingIdRef.current = null;
          reject(new Error('音频加载超时'));
        }
      }, 5000);

      audio.addEventListener('canplay', () => clearTimeout(timeout), { once: true });
      audio.addEventListener('error', () => clearTimeout(timeout), { once: true });

      // 设置音频源，触发加载
      audio.src = audioUrl;
    });
  }, []);

  // 播放语音（主入口）
  const play = useCallback(async (text: string, messageId: string) => {
    // 点击同一条消息：停止播放
    if (currentPlayingIdRef.current === messageId && state.isPlaying) {
      stop();
      return;
    }

    // 停止之前的播放
    stop();

    const clean = cleanText(text);
    if (!clean) return;

    setState({
      isPlaying: false,
      playingId: messageId,
      isLoading: true,
      error: null,
    });

    try {
      // 方案1: 服务端 edge-tts
      const serverUrl = buildServerTTSUrl(text, persona, isCompanion);
      await playAudioUrl(serverUrl, messageId);
    } catch (serverError) {
      console.warn('Server TTS failed, trying Google TTS:', serverError);

      // 如果是用户主动停止的，不再尝试
      if (currentPlayingIdRef.current !== messageId) return;

      try {
        // 方案2: Google Translate TTS 兜底
        setState({
          isPlaying: false,
          playingId: messageId,
          isLoading: true,
          error: null,
        });
        const googleUrl = buildGoogleTTSUrl(text);
        await playAudioUrl(googleUrl, messageId);
      } catch (googleError) {
        console.error('Google TTS also failed:', googleError);
        if (currentPlayingIdRef.current === messageId) {
          currentPlayingIdRef.current = null;
          audioRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: '语音暂时不可用',
          });
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
    isPlayingMessage,
    isLoadingMessage,
  };
}
