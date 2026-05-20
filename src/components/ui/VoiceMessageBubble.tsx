'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceMessageBubbleProps {
  audioUrl: string;
  durationMs: number;
  isUser: boolean;
  onTranscript?: (text: string) => void;
}

export function VoiceMessageBubble({ audioUrl, durationMs, isUser, onTranscript }: VoiceMessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);

  const durationSec = Math.max(1, Math.round(durationMs / 1000));

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setProgress(pct || 0);
        }
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  // 长按弹出菜单
  const handlePointerDown = useCallback(() => {
    longPressTimer.current = window.setTimeout(() => {
      setShowMenu(true);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // 点击菜单外部关闭
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showMenu]);

  // 语音转文字
  const handleTranscribe = useCallback(async () => {
    setShowMenu(false);
    if (!onTranscript) return;

    setIsTranscribing(true);
    try {
      // 从audioUrl获取音频并上传STT
      const audioRes = await fetch(audioUrl);
      const audioBlob = await audioRes.blob();
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');

      const res = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.text) {
        onTranscript(data.text);
      }
    } catch (err) {
      console.error('[VoiceMessage] transcribe error:', err);
    } finally {
      setIsTranscribing(false);
    }
  }, [audioUrl, onTranscript]);

  // 根据时长调整气泡宽度（1-10秒对应不同宽度）
  const bubbleWidth = Math.min(Math.max(durationSec * 6, 30), 70);

  return (
    <div className="relative" ref={menuRef}>
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl cursor-pointer select-none ${
          isUser
            ? 'bg-[#FF6B35] text-white rounded-tr-md'
            : 'bg-[#2A2A45] text-gray-100 rounded-tl-md'
        }`}
        style={{ minWidth: `${bubbleWidth}%`, maxWidth: '80%' }}
        onClick={togglePlay}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* 播放按钮 */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser ? 'bg-white/20' : 'bg-white/10'
        }`}>
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </div>

        {/* 音频条 */}
        <div className="flex-1 flex items-center gap-0.5 h-4">
          {Array.from({ length: Math.min(durationSec, 30) }).map((_, i) => (
            <div
              key={i}
              className={`w-0.5 rounded-full transition-all ${
                i < (progress / 100) * durationSec
                  ? isUser ? 'bg-white' : 'bg-orange-400'
                  : isUser ? 'bg-white/40' : 'bg-white/20'
              }`}
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>

        {/* 时长 */}
        <span className="text-xs opacity-70 flex-shrink-0">
          {isTranscribing ? '...' : `${durationSec}"`}
        </span>
      </div>

      {/* 长按菜单 */}
      {showMenu && onTranscript && (
        <div className={`absolute z-50 ${isUser ? 'right-0' : 'left-0'} bottom-full mb-2`}>
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 min-w-[120px]">
            <button
              onClick={(e) => { e.stopPropagation(); handleTranscribe(); }}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              语音转文字
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
