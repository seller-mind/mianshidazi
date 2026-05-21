'use client';

import { useState, useRef, useCallback } from 'react';

interface VoiceInputProps {
  onVoiceSend: (localUrl: string, durationMs: number) => void;
  disabled?: boolean;
}

type VoiceState = 'idle' | 'recording' | 'error';

function canMediaRecord(): boolean {
  return typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined';
}

export function VoiceInput({ onVoiceSend, disabled }: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [recordingMs, setRecordingMs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    if (!canMediaRecord()) {
      setState('error');
      setErrorMsg('请用浏览器打开');
      setTimeout(() => setState('idle'), 2000);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const durationMs = Date.now() - startTimeRef.current;
        if (durationMs < 300) {
          cleanup();
          setState('idle');
          setRecordingMs(0);
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const localUrl = URL.createObjectURL(blob);
        onVoiceSend(localUrl, durationMs);
        cleanup();
        setState('idle');
        setRecordingMs(0);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState('recording');
      setRecordingMs(0);

      timerRef.current = window.setInterval(() => {
        setRecordingMs(d => d + 100);
      }, 100);
    } catch {
      setState('error');
      setErrorMsg('请允许麦克风权限');
      setTimeout(() => setState('idle'), 2000);
    }
  }, [onVoiceSend, cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const toggle = useCallback(() => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle') {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}"` : `${Math.floor(s / 60)}'${(s % 60).toString().padStart(2, '0')}"`;
  };

  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={`flex items-center justify-center rounded-full transition-all ${
          state === 'recording'
            ? 'w-14 h-14 bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
            : state === 'error'
            ? 'w-12 h-12 bg-red-100 text-red-500'
            : 'w-12 h-12 bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/20 active:scale-95'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={state === 'recording' ? '点击发送' : '点击录音'}
      >
        {state === 'recording' ? (
          // 发送图标
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        ) : (
          // 麦克风图标
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </button>

      {state === 'recording' && (
        <div className="ml-3 flex items-center gap-2">
          <span className="text-sm font-mono text-red-500 font-medium">{formatTime(recordingMs)}</span>
          <span className="text-xs text-gray-400">点击发送</span>
        </div>
      )}

      {state === 'idle' && !disabled && (
        <span className="ml-2 text-xs text-gray-400">点击说话</span>
      )}

      {state === 'error' && errorMsg && (
        <span className="ml-2 text-xs text-red-500">{errorMsg}</span>
      )}
    </div>
  );
}
