'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type VoiceState = 'idle' | 'recording' | 'recognizing' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionCtor = any;

// 检测浏览器原生语音识别支持
function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// 检测MediaRecorder支持
function canMediaRecord(): boolean {
  return typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined';
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const recognitionRef = useRef<InstanceType<ReturnType<typeof getSpeechRecognition>> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 方案1：浏览器原生SpeechRecognition（首选）
  const startNativeRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('recording');
    };

    recognition.onresult = (event: { results: { transcript: string }[][] }) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        onTranscript(transcript);
      }
      setState('idle');
    };

    recognition.onerror = (event: { error: string }) => {
      console.warn('[VoiceInput] native recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setState('error');
        setErrorMsg('请允许麦克风权限');
        setTimeout(() => setState('idle'), 2000);
      } else if (event.error === 'no-speech') {
        setState('idle');
      } else {
        // 原生识别失败，降级到录音上传
        console.log('[VoiceInput] native failed, falling back to recording upload');
        startRecordingUpload();
      }
    };

    recognition.onend = () => {
      if (state === 'recording') setState('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
    return true;
  }, [onTranscript, state]);

  // 方案2：录音上传Whisper API（降级）
  const startRecordingUpload = useCallback(async () => {
    if (!canMediaRecord()) {
      setState('error');
      setErrorMsg('请用浏览器打开使用语音');
      setTimeout(() => setState('idle'), 3000);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });

        if (blob.size < 1000) {
          setState('idle');
          return;
        }

        setState('recognizing');

        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');

          const res = await fetch('/api/stt', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (data.text) {
            onTranscript(data.text);
          } else {
            setState('error');
            setErrorMsg(data.error || '识别失败');
            setTimeout(() => setState('idle'), 2000);
            return;
          }
        } catch {
          setState('error');
          setErrorMsg('识别失败，请重试');
          setTimeout(() => setState('idle'), 2000);
          return;
        }

        setState('idle');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState('recording');
    } catch {
      setState('error');
      setErrorMsg('请允许麦克风权限');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [onTranscript]);

  const start = useCallback(() => {
    // 优先用浏览器原生识别
    const nativeStarted = startNativeRecognition();
    if (!nativeStarted) {
      // 不支持原生，用录音上传
      startRecordingUpload();
    }
  }, [startNativeRecognition, startRecordingUpload]);

  const stop = useCallback(() => {
    // 停止原生识别
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    // 停止录音
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggle = useCallback(() => {
    if (state === 'recording') {
      stop();
    } else if (state === 'idle') {
      start();
    }
  }, [state, start, stop]);

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled || state === 'recognizing'}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
          state === 'recording'
            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
            : state === 'recognizing'
            ? 'bg-orange-400 text-white'
            : state === 'error'
            ? 'bg-red-100 text-red-500'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={
          state === 'recording' ? '点击停止'
          : state === 'recognizing' ? '识别中...'
          : '语音输入'
        }
      >
        {state === 'recognizing' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>
      {state === 'recording' && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50">
          正在录音，点击停止...
        </div>
      )}
      {state === 'recognizing' && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50">
          识别中...
        </div>
      )}
      {state === 'error' && errorMsg && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
