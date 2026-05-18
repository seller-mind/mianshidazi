'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TensionMeterProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

export function TensionMeter({ 
  value, 
  size = 'md', 
  showLabel = true,
  animated = true 
}: TensionMeterProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);

  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }

    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, animated]);

  const sizes = {
    sm: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-xs' },
    md: { container: 'w-32 h-32', text: 'text-3xl', label: 'text-sm' },
    lg: { container: 'w-40 h-40', text: 'text-4xl', label: 'text-base' },
  };

  const getColor = (val: number) => {
    if (val < 30) return { from: '#10B981', to: '#34D399', label: '轻松' };
    if (val < 60) return { from: '#F59E0B', to: '#FBBF24', label: '适度' };
    return { from: '#EF4444', to: '#F87171', label: '紧张' };
  };

  const colors = getColor(displayValue);
  const percentage = displayValue / 100;
  const angle = percentage * 270 - 135; // 从135度开始，画270度

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={cn('relative', sizes[size].container)}>
        {/* 背景圆环 */}
        <svg className="w-full h-full -rotate-[135deg]" viewBox="0 0 100 100">
          {/* 背景弧 */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200 dark:text-gray-700"
            strokeDasharray={`${270 * 0.75} ${300}`}
            strokeLinecap="round"
          />
          {/* 渐变弧 */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={`url(#gradient-${value})`}
            strokeWidth="8"
            strokeDasharray={`${angle * 0.75} ${300}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          {/* 渐变定义 */}
          <defs>
            <linearGradient id={`gradient-${value}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.from} />
              <stop offset="100%" stopColor={colors.to} />
            </linearGradient>
          </defs>
        </svg>
        
        {/* 中心数字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold text-gray-800 dark:text-white', sizes[size].text)}>
            {displayValue}
          </span>
          <span className={cn('text-gray-500 dark:text-gray-400', sizes[size].label)}>%</span>
        </div>
      </div>

      {showLabel && (
        <span 
          className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            displayValue < 30 && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            displayValue >= 30 && displayValue < 60 && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            displayValue >= 60 && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}
        >
          {colors.label}
        </span>
      )}
    </div>
  );
}
