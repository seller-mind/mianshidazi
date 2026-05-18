'use client';

import { cn } from '@/lib/utils';

interface AvatarProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'ada' | 'user';
  className?: string;
}

export function Avatar({ name, size = 'md', variant = 'ada', className }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const variants = {
    ada: 'bg-gradient-to-br from-[#FF6B35] to-[#E55A28] text-white',
    user: 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300',
  };

  const displayName = name || (variant === 'ada' ? '阿' : '我');

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {displayName}
    </div>
  );
}

// 带动画的阿搭头像
export function AdaAvatar({ size = 'md', className }: Omit<AvatarProps, 'variant' | 'name'>) {
  return (
    <div className={cn('relative', className)}>
      <Avatar variant="ada" size={size} />
      {/* 状态指示点 */}
      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
    </div>
  );
}
