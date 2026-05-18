'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TENSION_TYPES } from '@/lib/ai/config';
import { generateLocalResponse } from '@/lib/ai/chat';
import { ChatBubble, Button, AdaAvatar, Card } from '@/components/ui';
import type { ChatMessage, TensionLevel } from '@/types';
import { generateId } from '@/lib/utils';

function PracticeContent() {
  const searchParams = useSearchParams();
  const tensionType = (searchParams.get('type') as TensionLevel) || undefined;
  const tensionIndex = searchParams.get('tension');
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const typeInfo = tensionType ? TENSION_TYPES[tensionType] : null;

  // 初始化对话
  const startSession = () => {
    setSessionStarted(true);
    const welcomeMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: tensionType
        ? `你好！我是阿搭。看到你是${typeInfo?.name}，我会根据你的特点来陪你练习。准备好了吗？我们先从自我介绍开始吧，介绍一下你自己，从哪里开始都行。`
        : `你好！我是阿搭，来陪你练练面试。准备好了吗？我们先从自我介绍开始吧，介绍一下你自己，从哪里开始都行。`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // 模拟AI响应（本地版本）
    setTimeout(() => {
      const response = generateLocalResponse(inputValue.trim(), tensionType);
      const adaMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, adaMessage]);
      setIsLoading(false);
    }, 1000 + Math.random() * 1000);
  };

  // 结束面试
  const handleEndSession = () => {
    const endMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '好的，今天的模拟面试就到这里。你表现得比我想象中要好，别不信！',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, endMessage]);
  };

  if (!sessionStarted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-2xl mx-auto">
          {/* 返回按钮 */}
          <a href="/" className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#FF6B35] transition-colors mb-8">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </a>

          {/* 开始页面 */}
          <div className="min-h-[70vh] flex flex-col justify-center">
            <div className="text-center mb-12">
              <AdaAvatar size="xl" className="mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-4">
                AI模拟面试练习
              </h1>
              {tensionType && typeInfo && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B35]/10 text-[#FF6B35] rounded-full text-sm mb-4">
                  <span>{typeInfo.emoji}</span>
                  <span>{typeInfo.name}</span>
                  {tensionIndex && <span>| 紧张指数 {tensionIndex}%</span>}
                </div>
              )}
              <p className="text-[#6B7280] dark:text-gray-400 max-w-md mx-auto">
                阿搭会模拟真实面试官，追问你的简历和经历，帮你提前适应面试节奏。
              </p>
            </div>

            {/* 准备清单 */}
            <Card className="mb-8">
              <h3 className="font-semibold text-[#1F2937] dark:text-white mb-4">面试前准备</h3>
              <ul className="space-y-3">
                {[
                  '找一个安静的环境',
                  '准备好纸笔记录要点',
                  '放松，像和朋友聊天一样',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-[#6B7280] dark:text-gray-400">
                    <span className="w-6 h-6 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center text-xs">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            <Button size="lg" className="w-full" onClick={startSession}>
              开始练习
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-[#1A1A2E] flex flex-col">
      {/* 顶部栏 */}
      <header className="bg-white dark:bg-[#252542] border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AdaAvatar size="sm" />
            <div>
              <p className="font-medium text-[#1F2937] dark:text-white">阿搭</p>
              <p className="text-xs text-green-500">在线</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleEndSession}>
            结束面试
          </Button>
        </div>
      </header>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.filter(m => m.role !== 'system').map((message) => (
            <div key={message.id} className="animate-fade-in">
              <ChatBubble message={message.content} role={message.role as 'user' | 'assistant'} />
            </div>
          ))}
          
          {isLoading && (
            <ChatBubble message="" role="assistant" isLoading />
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <footer className="bg-white dark:bg-[#252542] border-t border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入你的回答..."
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-[#1A1A2E] rounded-xl text-[#1F2937] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={!inputValue.trim() || isLoading} isLoading={isLoading}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            按 Enter 发送 | 阿搭正在倾听
          </p>
        </div>
      </footer>
    </main>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white text-2xl font-bold animate-pulse">
            阿
          </div>
          <p className="mt-4 text-[#6B7280]">正在加载...</p>
        </div>
      </div>
    }>
      <PracticeContent />
    </Suspense>
  );
}
