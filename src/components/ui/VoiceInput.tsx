'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null); // null = 未检测

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionError {
    error: string;
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

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setSupported(isSupported);
    return () => { recognitionRef.current?.abort(); };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognitionClass = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  const toggle = useCallback(() => {
    if (state === 'listening') {
      recognitionRef.current?.stop();
      setState('idle');
      return;
    }

    if (!supported) {
      setState('error');
      setErrorMsg('请用浏览器打开 mianshidazi.com 使用语音输入');
      setTimeout(() => setState('idle'), 3000);
      return;
    }

    const SpeechRecognition = SpeechRecognitionClass;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'zh-CN';

    recognition.onstart = () => setState('listening');

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal && last[0].transcript) {
        onTranscript(last[0].transcript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionError) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setState('error');
        setErrorMsg('请允许麦克风权限，或用浏览器打开');
        setTimeout(() => setState('idle'), 3000);
      } else {
        setState('idle');
      }
    };

    recognition.onend = () => setState('idle');

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setState('error');
      setErrorMsg('语音识别不可用，请用浏览器打开');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [state, supported, onTranscript]);

  if (supported === null) return null;

  // 在不支持的环境下也显示按钮（点击会提示用户）
  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
          state === 'listening'
            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
            : state === 'error'
            ? 'bg-red-100 text-red-500'
            : state === 'processing'
            ? 'bg-orange-100 text-orange-500'
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
      {state === 'error' && errorMsg && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50">
          {errorMsg}
        </div>
      )}
      {state === 'listening' && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50">
          正在听...
        </div>
      )}
    </div>
  );
}
