'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type VoiceState = 'idle' | 'listening' | 'unsupported';

// Web Speech API 类型
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionError {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionError) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    setSupported(!!isSupported);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const toggle = useCallback(() => {
    if (state === 'listening') {
      // 停止
      recognitionRef.current?.stop();
      setState('idle');
      return;
    }

    // 开始
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // 单次识别
    recognition.interimResults = false; // 只要最终结果
    recognition.lang = 'zh-CN';

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal && last[0].transcript) {
        onTranscript(last[0].transcript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionError) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        // 麦克风权限被拒
        setSupported(false);
      }
      setState('idle');
    };

    recognition.onend = () => {
      setState('idle');
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setState('idle');
    }
  }, [state, onTranscript]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-all ${
        state === 'listening'
          ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      title={state === 'listening' ? '点击停止' : '语音输入'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  );
}
