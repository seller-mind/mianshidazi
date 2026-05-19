'use client';

import { useState, useRef, useEffect } from 'react';
import { useTTS } from '@/lib/hooks/useTTS';
import { TTSPlayButton } from '@/components/ui/TTSPlayButton';
import { AIBadge } from '@/components/AIDisclaimer';

// 消息类型
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface InterviewChatProps {
  sessionId: string;
  persona: 'A' | 'B' | 'C' | 'D' | 'E';
  interviewType?: string;
}

export default function InterviewChat({ sessionId, persona, interviewType = '通用面试' }: InterviewChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TTS 语音播放
  const { play, stop, preload, isPreloaded, isPreloading, isPlayingMessage, isLoadingMessage, error: ttsError } = useTTS({ persona });

  // 自动滚动到底部 + 预加载新消息的语音
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // AI 新消息出现时自动预加载语音
    messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.content) {
        preload(msg.content, msg.id);
      }
    });
  }, [messages, preload]);

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          persona,
          sessionId,
          interviewType,
        }),
      });

      if (!response.ok) {
        throw new Error('发送失败');
      }

      // 处理SSE流式响应
      if (!response.body) {
        throw new Error('响应体为空，请稍后重试');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // 检查是否有错误
              if (!assistantMessage.trim()) {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: '抱歉，暂时无法回复，请稍后重试。' }
                      : msg
                  )
                );
              }
              setIsLoading(false);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              // 处理错误响应
              if (parsed.error) {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: `出错了: ${parsed.error}` }
                      : msg
                  )
                );
                break;
              }
              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: assistantMessage }
                      : msg
                  )
                );
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 2).toString(), role: 'assistant', content: `抱歉，发送失败了: ${error instanceof Error ? error.message : '请稍后重试'}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 键盘发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto border rounded-lg">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* AI内容标识 - 根据《人工智能生成合成内容标识办法》 */}
        <div className="text-xs text-gray-500 dark:text-gray-400 py-2 px-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <AIBadge />
            <span className="text-[10px]">根据《人工智能生成合成内容标识办法》标注</span>
          </div>
          <p className="leading-relaxed">
            本对话内容由AI生成，仅供参考。AI提供的面试建议不构成专业职业指导或心理治疗建议。
          </p>
        </div>
        
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg">👋 你好！</p>
            <p className="mt-2">准备好开始面试练习了吗？</p>
          </div>
        )}
        
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-2`}
          >
            {msg.role === 'assistant' && msg.content && (
              <TTSPlayButton
                isPlaying={isPlayingMessage(msg.id)}
                isLoading={isLoadingMessage(msg.id)}
                onClick={() => play(msg.content, msg.id)}
                disabled={!msg.content.trim()}
                size="sm"
              />
            )}
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1 mb-1">
                  <AIBadge />
                </div>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <span className="animate-pulse">面试官正在思考...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的回答..."
            className="flex-1 border rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  );
}
