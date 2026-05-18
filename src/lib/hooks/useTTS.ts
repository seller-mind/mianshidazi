// TTS 语音播放 Hook
// 管理音频播放状态，支持同一时间只播放一条消息

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

  // 清理函数
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 停止播放
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
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

  // 播放语音
  const play = useCallback(async (text: string, messageId: string) => {
    // 如果正在播放同一条消息，则停止
    if (currentPlayingIdRef.current === messageId && audioRef.current) {
      stop();
      return;
    }

    // 停止之前的播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    setState({
      isPlaying: false,
      playingId: messageId,
      isLoading: true,
      error: null,
    });

    try {
      // 调用 TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          persona,
          isCompanion,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '语音合成失败');
      }

      // 获取音频 Blob
      const audioBlob = await response.blob();
      
      // 创建音频 URL
      const audioUrl = URL.createObjectURL(audioBlob);

      // 创建 Audio 对象
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      currentPlayingIdRef.current = messageId;

      // 设置播放完成回调
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (currentPlayingIdRef.current === messageId) {
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: null,
          });
        }
      };

      // 设置错误回调
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (currentPlayingIdRef.current === messageId) {
          currentPlayingIdRef.current = null;
          setState({
            isPlaying: false,
            playingId: null,
            isLoading: false,
            error: '音频播放失败',
          });
        }
      };

      // 开始播放
      setState({
        isPlaying: true,
        playingId: messageId,
        isLoading: false,
        error: null,
      });
      
      await audio.play();

    } catch (error) {
      console.error('TTS play error:', error);
      currentPlayingIdRef.current = null;
      setState({
        isPlaying: false,
        playingId: null,
        isLoading: false,
        error: error instanceof Error ? error.message : '语音合成失败',
      });
    }
  }, [persona, isCompanion, stop]);

  // 检查指定消息是否正在播放
  const isPlayingMessage = useCallback((messageId: string) => {
    return state.playingId === messageId && state.isPlaying;
  }, [state.playingId, state.isPlaying]);

  // 检查指定消息是否正在加载
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
