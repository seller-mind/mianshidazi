'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { generateId } from '@/lib/utils';
import { useTTS } from '@/lib/hooks/useTTS';
import { TTSPlayButton } from '@/components/ui/TTSPlayButton';
import { AIBadge } from '@/components/AIDisclaimer';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { VoiceMessageBubble } from '@/components/ui/VoiceMessageBubble';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // 语音消息
  isVoice?: boolean;
  voiceUrl?: string;
  voiceDurationMs?: number;
  voiceTranscript?: string; // 转文字结果
}

export default function CompanionPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => generateId());
  const [context, setContext] = useState('日常');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TTS 语音播放 - 阿搭陪伴使用专属音色
  const { play, preload, isPlayingMessage, isLoadingMessage } = useTTS({ isCompanion: true });

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 预加载语音：所有AI消息都预加载（包括欢迎消息）
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.content) {
        preload(msg.content, msg.id);
      }
    });
  }, [messages, preload]);

  // 初始化欢迎消息
  useEffect(() => {
    const hour = new Date().getHours();
    let welcomeContext = '日常';
    
    if (hour >= 0 && hour < 6) {
      welcomeContext = '深夜';
    }
    
    setContext(welcomeContext);
    
    const welcomeMessages: Message[] = [
      {
        id: 'welcome-1',
        role: 'assistant',
        content: '嗨，你来啦。我是阿搭，你的面试搭子。不管是面试前紧张、面试后崩溃、还是等通知等焦虑，都可以跟我说。我在这里。',
      },
    ];

    if (welcomeContext === '深夜') {
      welcomeMessages.push({
        id: 'welcome-2',
        role: 'assistant',
        content: '这么晚还没睡？明天有面试吗？',
      });
    }

    setMessages(welcomeMessages);
  }, []);

  // 发送消息
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          context,
          sessionId,
          history: messages.map(m => ({ role: m.role, content: m.content })),
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
      const assistantId = generateId();

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
              if (!assistantMessage.trim()) {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: '抱歉，阿搭打了个盹，请再说一遍～' }
                      : msg
                  )
                );
              }
              break;
            }
            try {
              const parsed = JSON.parse(data);
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
        { id: generateId(), role: 'assistant', content: `抱歉，出了点问题: ${error instanceof Error ? error.message : '请稍后重试'}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 语音发送
  const handleVoiceSend = useCallback(async (blob: Blob, durationMs: number) => {
    if (isLoading) return;

    // 先上传音频获取临时URL
    const formData = new FormData();
    formData.append('audio', blob, 'voice.webm');

    try {
      const uploadRes = await fetch('/api/voice-upload', {
        method: 'POST',
        body: formData,
      });

      let voiceUrl = '';
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        voiceUrl = uploadData.url || '';
      }

      // 同时做语音识别，拿到文字用于AI对话
      const sttFormData = new FormData();
      sttFormData.append('audio', blob, 'voice.webm');

      let transcript = '';
      try {
        const sttRes = await fetch('/api/stt', {
          method: 'POST',
          body: sttFormData,
        });
        if (sttRes.ok) {
          const sttData = await sttRes.json();
          transcript = sttData.text || '';
        }
      } catch {
        // 识别失败不影响发送
      }

      // 添加语音消息到界面
      const voiceMessage: Message = {
        id: generateId(),
        role: 'user',
        content: transcript || '(语音消息)',
        isVoice: true,
        voiceUrl,
        voiceDurationMs: durationMs,
      };

      setMessages(prev => [...prev, voiceMessage]);

      // 自动发送给AI（用识别出的文字）
      if (transcript) {
        setIsLoading(true);
        try {
          const response = await fetch('/api/chat/companion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: transcript,
              context,
              sessionId,
              history: messages.map(m => ({ role: m.role, content: m.content })),
            }),
          });

          if (!response.ok) throw new Error('发送失败');
          if (!response.body) throw new Error('响应体为空');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let assistantMessage = '';
          const assistantId = generateId();

          setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') break;
                try {
                  const parsed = JSON.parse(data);
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
                } catch { /* ignore */ }
              }
            }
          }
        } catch (error) {
          setMessages(prev => [
            ...prev,
            { id: generateId(), role: 'assistant', content: '抱歉，出了点问题，请重试' },
          ]);
        } finally {
          setIsLoading(false);
        }
      }
    } catch {
      // 上传也失败，直接用识别结果当文字消息
    }
  }, [isLoading, context, sessionId, messages]);

  // 语音转文字回调
  const handleVoiceTranscript = useCallback((messageId: string, text: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, voiceTranscript: text }
          : msg
      )
    );
  }, []);

  // 键盘发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // 快速入口
  const quickEntries = [
    { text: '面试前紧张', context: '面试前' },
    { text: '刚面试完', context: '面试后' },
    { text: '等通知焦虑', context: '等通知' },
    { text: '心情不好', context: '崩溃急救' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A2E] to-[#252542] flex flex-col">
      {/* 顶部栏 */}
      <header className="bg-[#252542] border-b border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-sm">
              阿
            </div>
            <div>
              <p className="font-medium text-white text-sm">阿搭</p>
              <p className="text-xs text-green-400">在线 · 随时都在</p>
            </div>
          </Link>
          
          <Link href="/practice">
            <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:text-white">
              去练习面试 →
            </Button>
          </Link>
        </div>
      </header>

      {/* 快速入口 */}
      <div className="bg-[#1F1F35] px-4 py-3 border-b border-gray-800">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickEntries.map((entry) => (
              <button
                key={entry.context}
                onClick={() => {
                  setContext(entry.context);
                  setMessages(prev => [
                    ...prev,
                    {
                      id: generateId(),
                      role: 'assistant',
                      content: `好的，来聊聊"${entry.text}"这个话题。\n\n${getContextIntro(entry.context)}`,
                    },
                  ]);
                }}
                className="px-3 py-1.5 bg-[#2A2A45] text-gray-300 text-xs rounded-full whitespace-nowrap hover:bg-[#3A3A55] transition-colors"
              >
                {entry.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* AI内容标识 */}
          <div className="text-xs text-gray-400 py-2 px-3 bg-[#3A3A55]/50 rounded-lg border border-amber-900/30 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <AIBadge />
              <span>根据《人工智能生成合成内容标识办法》标注</span>
            </div>
            <p className="leading-relaxed">
              本对话内容由AI生成，仅供参考。阿搭提供的心理陪伴建议不构成专业心理咨询或治疗。
            </p>
          </div>
          
          {messages.map((msg) => (
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
                  variant="dark"
                />
              )}
              
              {/* 语音消息气泡 */}
              {msg.isVoice && msg.voiceUrl ? (
                <div className={msg.role === 'user' ? 'flex flex-col items-end gap-1' : 'flex flex-col items-start gap-1'}>
                  <VoiceMessageBubble
                    audioUrl={msg.voiceUrl}
                    durationMs={msg.voiceDurationMs || 1000}
                    isUser={msg.role === 'user'}
                    onTranscript={msg.voiceTranscript ? undefined : (text) => handleVoiceTranscript(msg.id, text)}
                  />
                  {msg.voiceTranscript && (
                    <p className="text-xs text-gray-400 max-w-[80%] px-2">
                      {msg.voiceTranscript}
                    </p>
                  )}
                </div>
              ) : (
                /* 文字消息气泡 */
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-[#FF6B35] text-white rounded-tr-md'
                      : 'bg-[#2A2A45] text-gray-100 rounded-tl-md'
                  }`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1">
                      <AIBadge />
                    </div>
                  )}
                  {msg.content}
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#2A2A45] px-4 py-3 rounded-2xl rounded-tl-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入框 */}
      <div className="bg-[#252542] border-t border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 items-end">
            <VoiceInput
              onVoiceSend={handleVoiceSend}
              disabled={isLoading}
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="和阿搭聊聊..."
              className="flex-1 bg-[#1F1F35] text-white rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35] placeholder-gray-500"
              rows={1}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              isLoading={isLoading}
              className="self-end"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            阿搭 24小时在线，随时陪你聊天
          </p>
        </div>
      </div>
    </div>
  );
}

// 获取上下文介绍
function getContextIntro(context: string): string {
  const intros: Record<string, string> = {
    '面试前': '马上要面试了？来，我给你说几个临场技巧，让你上场更有底气。',
    '面试后': '刚面试完？先不管结果怎么样，来跟我说说。',
    '等通知': '等通知的日子最难熬。我懂，来聊聊。',
    '崩溃急救': '想哭就哭出来。我在这里。',
    '日常': '没什么特别的事也可以聊聊。',
  };
  return intros[context] || intros['日常'];
}
