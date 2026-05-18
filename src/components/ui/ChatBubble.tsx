'use client';

import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  message: string;
  role: 'user' | 'assistant';
  isLoading?: boolean;
}

export function ChatBubble({ message, role, isLoading }: ChatBubbleProps) {
  const isAda = role === 'assistant';

  return (
    <div className={cn('flex gap-3', isAda ? 'justify-start' : 'justify-end')}>
      {isAda && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
          阿
        </div>
      )}
      
      <div
        className={cn(
          'max-w-[80%] px-4 py-3 rounded-2xl',
          isAda
            ? 'chat-bubble-ada text-white rounded-tl-md'
            : 'chat-bubble-user text-[#1F2937] dark:text-white rounded-tr-md'
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-80">阿搭正在输入</span>
            <span className="flex gap-1">
              <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        )}
      </div>

      {!isAda && (
        <div className="w-8 h-8 rounded-full bg-[#E5E7EB] dark:bg-[#374151] flex items-center justify-center text-[#6B7280] font-medium text-sm flex-shrink-0">
          我
        </div>
      )}
    </div>
  );
}
