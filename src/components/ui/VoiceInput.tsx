'use client';

import { useState, useRef, useCallback } from 'react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // 停止所有音轨
        stream.getTracks().forEach(t => t.stop());

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) {
          setState('idle');
          return;
        }

        setState('processing');

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
          }
        } catch {
          // 识别失败，静默处理
        }

        setState('idle');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setState('recording');
    } catch {
      // 麦克风权限被拒绝或不支持
      setState('idle');
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const toggle = useCallback(() => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  }, [state, startRecording, stopRecording]);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || state === 'processing'}
      className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-all ${
        state === 'recording'
          ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
          : state === 'processing'
          ? 'bg-orange-400 text-white animate-spin'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      title={
        state === 'recording' ? '点击停止录音' 
        : state === 'processing' ? '识别中...' 
        : '按住说话'
      }
    >
      {state === 'processing' ? (
        // 加载圈
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ) : (
        // 麦克风图标
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </button>
  );
}
