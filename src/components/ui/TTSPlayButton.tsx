'use client';

import { memo } from 'react';

interface TTSPlayButtonProps {
  isPlaying: boolean;
  isLoading: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export const TTSPlayButton = memo(function TTSPlayButton({
  isPlaying,
  isLoading,
  onClick,
  disabled = false,
  size = 'sm',
  variant = 'light',
}: TTSPlayButtonProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // isLoading时不disabled，让用户可以取消请求

  const isDisabled = disabled && !isLoading;

  // 根据variant返回对应状态的样式类
  const getStateClasses = () => {
    if (isDisabled) {
      return variant === 'dark'
        ? 'bg-white/10 text-white/40 cursor-not-allowed'
        : 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
    if (isLoading) {
      return variant === 'dark'
        ? 'bg-white/20 text-white/70 cursor-pointer hover:bg-white/30'
        : 'bg-gray-100 text-gray-400 cursor-pointer hover:bg-gray-200';
    }
    if (isPlaying) {
      return variant === 'dark'
        ? 'bg-orange-500/30 text-orange-400 hover:bg-orange-500/40 cursor-pointer'
        : 'bg-orange-100 text-orange-500 hover:bg-orange-200 cursor-pointer';
    }
    // 静止状态
    return variant === 'dark'
      ? 'bg-white/20 text-white cursor-pointer hover:bg-white/30 hover:text-white/90'
      : 'bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200 hover:text-gray-600';
  };

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        rounded-full
        transition-all duration-200
        ${getStateClasses()}
      `}
      title={isLoading ? '取消语音生成' : isPlaying ? '停止播放' : '播放语音'}
    >
      {isLoading ? (
        // 加载动画 - 点击可取消
        <svg
          className={`${iconSizes[size]} animate-spin`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : isPlaying ? (
        // 播放中 - 带动画的喇叭
        <div className="relative">
          <svg
            className={`${iconSizes[size]} text-orange-500`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          {/* 声波动画 */}
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
        </div>
      ) : (
        // 静止状态
        <svg
          className={iconSizes[size]}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      )}
    </button>
  );
});
