'use client';

import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  showLabel?: boolean;
  variant?: 'dots' | 'line' | 'number';
}

export function ProgressIndicator({ 
  current, 
  total, 
  showLabel = true,
  variant = 'dots'
}: ProgressIndicatorProps) {
  if (variant === 'number') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#FF6B35]">{current}</span>
        <span className="text-sm text-gray-400">/</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{total}</span>
      </div>
    );
  }

  if (variant === 'line') {
    return (
      <div className="flex flex-col gap-2">
        {showLabel && (
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>进度</span>
            <span>{Math.round((current / total) * 100)}%</span>
          </div>
        )}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full progress-gradient rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  // dots variant
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-300',
            index < current
              ? 'bg-[#FF6B35]'
              : index === current
              ? 'bg-[#FF6B35]/50 animate-pulse'
              : 'bg-gray-300 dark:bg-gray-600'
          )}
        />
      ))}
      {showLabel && (
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          {current + 1}/{total}
        </span>
      )}
    </div>
  );
}
