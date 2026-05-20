'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceInputProps {
  onVoiceSend: (blob: Blob, durationMs: number) => void;
  disabled?: boolean;
}

type VoiceState = 'idle' | 'recording' | 'recognizing' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionCtor = any;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function canMediaRecord(): boolean {
  return typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined';
}

export function VoiceInput({ onVoiceSend, disabled }: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
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
      setRecordingDuration(0);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });

        // 最小录音时长检查：至少500ms
        if (recordingDuration < 500) {
          setState('idle');
          return;
        }

        // 自动发送语音
        onVoiceSend(blob, recordingDuration);
        setState('idle');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState('recording');

      // 计时
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(d => d + 100);
      }, 100);

    } catch {
      setState('error');
      setErrorMsg('请允许麦克风权限');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [onVoiceSend, recordingDuration]);

  const toggle = useCallback(() => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle') {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  // 格式化显示时长
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}"`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled || state === 'recognizing'}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
          state === 'recording'
            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
            : state === 'error'
            ? 'bg-red-100 text-red-500'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={
          state === 'recording' ? '点击停止并发送'
          : '语音输入'
        }
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>

      {/* 录音时长显示 */}
      {state === 'recording' && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap bg-red-500 text-white text-xs px-4 py-2 rounded-lg shadow-lg z-50">
          <span className="font-mono text-sm">{formatDuration(recordingDuration)}</span>
          <span className="text-red-200">点击停止发送</span>
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
