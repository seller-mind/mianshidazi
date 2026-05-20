'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PERSONA_CONFIGS } from '@/lib/ai/prompts';
import { Button, Card } from '@/components/ui';
import { generateId } from '@/lib/utils';
import type { PersonaType, TensionLevel } from '@/types';
import { AIBadge } from '@/components/AIDisclaimer';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { VoiceMessageBubble } from '@/components/ui/VoiceMessageBubble';
import { useTTS } from '@/lib/hooks/useTTS';
import { TTSPlayButton } from '@/components/ui/TTSPlayButton';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isVoice?: boolean;
  voiceUrl?: string;
  voiceDurationMs?: number;
  voiceTranscript?: string;
}

function PracticeContent() {
  const searchParams = useSearchParams();
  const tensionType = (searchParams.get('type') as TensionLevel) || undefined;
  
  const [step, setStep] = useState<'select' | 'prepare' | 'interview'>('select');
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | null>(null);
  const [sessionId] = useState(() => generateId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TTS 语音播放
  const { play, preload, isPlayingMessage, isLoadingMessage } = useTTS({ persona: selectedPersona || 'A' });

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 预加载语音：所有AI消息立即预加载
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.content) {
        preload(msg.content, msg.id);
      }
    });
  }, [messages, preload]);

  // 开始面试
  const startInterview = () => {
    if (!selectedPersona) return;
    
    setStep('interview');
    
    // 开场白
    let intro = '';
    switch (selectedPersona) {
      case 'A':
        intro = '你好呀，今天我们来做一次轻松的面试练习。别紧张，这里没有真正的面试官，就当是和一个朋友聊天。我会问你一些常见的面试问题，你可以慢慢想，慢慢说。准备好了吗？';
        break;
      case 'B':
        intro = '你好，请坐。我是今天的面试官，我们大概用30-45分钟聊聊你的经历和能力。我们从自我介绍开始吧，先用1-2分钟介绍一下你自己。';
        break;
      case 'C':
        intro = '嗯，那我们开始吧。先用一分钟介绍一下自己，说重点。';
        break;
      case 'D':
        intro = '行，那咱们开始。你先自我介绍一下，说重点，别说废话。';
        break;
      case 'E':
        intro = '你好，先自我介绍一下吧。对了，我先简单说一下我们公司的情况——我们这是一个快速发展的平台，发展空间很大，机会很多。';
        break;
    }

    setMessages([
      {
        id: generateId(),
        role: 'assistant',
        content: intro,
      },
    ]);
  };

  // 发送消息
  const sendMessage = useCallback(async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isLoading || !selectedPersona) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: msgText,
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
          persona: selectedPersona,
          sessionId,
          tensionType,
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
              break;
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
        { id: generateId(), role: 'assistant', content: `抱歉，出了点问题: ${error instanceof Error ? error.message : '请稍后重试'}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, selectedPersona, sessionId, tensionType, messages]);

  // 结束面试
  const endInterview = () => {
    if (!selectedPersona) return;

    let endMessage = '';
    switch (selectedPersona) {
      case 'A':
        endMessage = '今天的练习很棒！愿意来练习就已经很勇敢了。我会在最后给你一份详细的反馈，帮你看到自己的闪光点和可以改进的地方。';
        break;
      case 'B':
        endMessage = '好，今天的面试到这里结束了。你有什么问题想问我吗？';
        break;
      case 'C':
        endMessage = '今天的面试到此结束。你还有什么想补充的吗？';
        break;
      case 'D':
        endMessage = '好了，说完了。你知道自己问题在哪了吗？刚才那几个点比较犀利，但真实的面试官没我毒。你能扛住我，就能扛住他们。来，我帮你复盘一下怎么答更好...';
        break;
      case 'E':
        endMessage = '好，今天的面试结束了。我们会在一周内通知你。（其实大概率不会通知）对了，你觉得我刚才说的哪些是套路？来，我帮你总结一下识别方法...';
        break;
    }

    setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: endMessage }]);
    setInterviewEnded(true);
  };

  // 跳转到报告
  const goToReport = () => {
    window.location.href = `/report?session=${sessionId}`;
  };

  // 语音发送：立即显示气泡，后台STT+AI
  const handleVoiceSend = useCallback((localUrl: string, durationMs: number) => {
    if (isLoading || !selectedPersona) return;

    const voiceId = generateId();
    const voiceMessage: Message = {
      id: voiceId,
      role: 'user',
      content: '(语音消息)',
      isVoice: true,
      voiceUrl: localUrl,
      voiceDurationMs: durationMs,
    };

    setMessages(prev => [...prev, voiceMessage]);

    // 后台STT
    (async () => {
      try {
        const res = await fetch(localUrl);
        const blob = await res.blob();
        const formData = new FormData();
        formData.append('audio', blob, 'voice.webm');

        const sttRes = await fetch('/api/stt', { method: 'POST', body: formData });
        if (sttRes.ok) {
          const sttData = await sttRes.json();
          const transcript = sttData.text || '';
          if (transcript) {
            setMessages(prev => prev.map(msg =>
              msg.id === voiceId ? { ...msg, content: transcript } : msg
            ));
            // 发给AI
            setIsLoading(true);
            try {
              const response = await fetch('/api/chat/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: transcript,
                  persona: selectedPersona,
                  sessionId,
                  tensionType,
                  history: [...messages, { ...voiceMessage, content: transcript }].map(m => ({ role: m.role, content: m.content })),
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
                for (const line of chunk.split('\n')) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.error) {
                        setMessages(prev => prev.map(msg =>
                          msg.id === assistantId ? { ...msg, content: `出错了: ${parsed.error}` } : msg
                        ));
                        break;
                      }
                      if (parsed.content) {
                        assistantMessage += parsed.content;
                        setMessages(prev => prev.map(msg =>
                          msg.id === assistantId ? { ...msg, content: assistantMessage } : msg
                        ));
                      }
                    } catch { /* ignore */ }
                  }
                }
              }
            } catch (error) {
              setMessages(prev => [...prev, {
                id: generateId(), role: 'assistant',
                content: `抱歉，出了点问题: ${error instanceof Error ? error.message : '请稍后重试'}`,
              }]);
            } finally {
              setIsLoading(false);
            }
          }
        }
      } catch (err) {
        console.warn('[Voice] STT failed:', err);
      }
    })();
  }, [isLoading, selectedPersona, sessionId, tensionType, messages]);

  // 语音转文字
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
      sendMessage();
    }
  };

  // 步骤1：选择人格
  if (step === 'select') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-2xl mx-auto">
          {/* 返回按钮 */}
          <Link href="/" className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#FF6B35] transition-colors mb-8">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>

          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-4">
              选择你的面试官
            </h1>
            <p className="text-[#6B7280] dark:text-gray-400">
              不同风格的面试官，帮你应对不同场景
            </p>
          </div>

          {/* 人格选择 */}
          <div className="space-y-4">
            {(Object.entries(PERSONA_CONFIGS) as [PersonaType, typeof PERSONA_CONFIGS['A']][]).map(([key, config]) => (
              <Card
                key={key}
                variant={selectedPersona === key ? 'highlight' : 'default'}
                className={`cursor-pointer transition-all ${selectedPersona === key ? 'ring-2 ring-[#FF6B35]' : ''}`}
                onClick={() => setSelectedPersona(key)}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{config.emoji}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#1F2937] dark:text-white mb-1">
                      {config.name}
                    </h3>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-2">
                      {config.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {config.suitableFor.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {config.warning && (
                      <p className="text-xs text-red-500 mt-2">{config.warning}</p>
                    )}
                  </div>
                  {selectedPersona === key && (
                    <div className="w-6 h-6 rounded-full bg-[#FF6B35] flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* 开始按钮 */}
          <div className="mt-8">
            <Button
              size="lg"
              className="w-full"
              disabled={!selectedPersona}
              onClick={startInterview}
            >
              {selectedPersona ? `开始 ${PERSONA_CONFIGS[selectedPersona].name}` : '请先选择面试官'}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // 步骤2：面试中
  return (
    <main className="min-h-screen bg-white dark:bg-[#1A1A2E] flex flex-col">
      {/* 顶部栏 */}
      <header className="bg-white dark:bg-[#252542] border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedPersona && PERSONA_CONFIGS[selectedPersona]?.emoji}</span>
            <div>
              <p className="font-medium text-[#1F2937] dark:text-white">
                {selectedPersona && PERSONA_CONFIGS[selectedPersona]?.name}
              </p>
              <p className="text-xs text-gray-500">
                AI模拟面试中
              </p>
            </div>
          </div>
          {!interviewEnded && (
            <Button variant="ghost" size="sm" onClick={endInterview}>
              结束面试
            </Button>
          )}
          {interviewEnded && (
            <Button size="sm" onClick={goToReport}>
              查看报告
            </Button>
          )}
        </div>
      </header>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* AI内容标识 - 根据《人工智能生成合成内容标识办法》 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 py-2 px-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <AIBadge />
              <span>根据《人工智能生成合成内容标识办法》标注</span>
            </div>
            <p className="leading-relaxed">
              本对话内容由AI生成，仅供参考。AI提供的面试建议不构成专业职业指导或心理治疗建议。
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
                />
              )}
              {msg.isVoice && msg.voiceUrl ? (
                <div className={msg.role === 'user' ? 'flex flex-col items-end gap-1' : 'flex flex-col items-start gap-1'}>
                  <VoiceMessageBubble
                    audioUrl={msg.voiceUrl}
                    durationMs={msg.voiceDurationMs || 1000}
                    isUser={msg.role === 'user'}
                    onTranscript={msg.voiceTranscript ? undefined : (text) => handleVoiceTranscript(msg.id, text)}
                  />
                  {msg.voiceTranscript && (
                    <p className="text-xs text-gray-400 max-w-[85%] px-2">
                      {msg.voiceTranscript}
                    </p>
                  )}
                </div>
              ) : (
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-[#FF6B35] text-white rounded-tr-md'
                    : 'bg-gray-100 dark:bg-[#2A2A45] text-[#1F2937] dark:text-gray-100 rounded-tl-md'
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
              <div className="bg-gray-100 dark:bg-[#2A2A45] px-4 py-3 rounded-2xl rounded-tl-md">
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

      {/* 面试结束提示 */}
      {interviewEnded && (
        <div className="bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800 px-6 py-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-green-700 dark:text-green-400 text-sm mb-3">
              🎉 面试结束！恭喜你完成了一次练习
            </p>
            <Button onClick={goToReport}>
              查看面试报告 →
            </Button>
          </div>
        </div>
      )}

      {/* 输入区域 */}
      {!interviewEnded && (
        <footer className="bg-white dark:bg-[#252542] border-t border-gray-100 dark:border-gray-800 px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-3 items-end">
              <VoiceInput
                onVoiceSend={handleVoiceSend}
                disabled={isLoading}
              />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的回答..."
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-[#1A1A2E] rounded-xl text-[#1F2937] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] resize-none"
                rows={1}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                isLoading={isLoading}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              按 Enter 发送 · 像真实面试一样回答
            </p>
          </div>
        </footer>
      )}
    </main>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </main>
    }>
      <PracticeContent />
    </Suspense>
  );
}
