'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { generateId } from '@/lib/utils';
import { useTTS } from '@/lib/hooks/useTTS';
import { TTSPlayButton } from '@/components/ui/TTSPlayButton';
import { AIBadge } from '@/components/AIDisclaimer';
import { useAuthContext } from '@/components/AuthProvider';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { VoiceMessageBubble } from '@/components/ui/VoiceMessageBubble';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isVoice?: boolean;
  voiceUrl?: string;
  voiceDurationMs?: number;
  voiceTranscript?: string;
}

export default function CompanionPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => generateId());
  const [context, setContext] = useState('日常');
  const [restoringHistory, setRestoringHistory] = useState(true);
  const [voiceRemaining, setVoiceRemaining] = useState<number>(-1); // -1=无限(付费), >=0=剩余次数
  const [voiceLimit, setVoiceLimit] = useState<number>(3);
  const [showVoicePaywall, setShowVoicePaywall] = useState(false);
  const [showTtsPaywall, setShowTtsPaywall] = useState(false);
  const { user: authUser } = useAuthContext();

  // 获取语音额度
  const fetchVoiceLimit = useCallback(async () => {
    try {
      const token = localStorage.getItem('msd_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/voice/limit', { headers });
      if (res.ok) {
        const data = await res.json();
        setVoiceRemaining(data.remaining);
        setVoiceLimit(data.limit);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchVoiceLimit();
  }, [fetchVoiceLimit]);

  // 保存消息到Supabase
  const saveMessages = useCallback(async (msgs: Message[]) => {
    if (msgs.length <= 1) return;
    try {
      const token = localStorage.getItem('msd_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      await fetch('/api/chat/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          type: 'companion',
          title: '阿搭聊天',
        }),
      });
      
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          messages: msgs.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            is_voice: m.isVoice || false,
          })),
        }),
      });
    } catch (err) {
      console.warn('[Companion] Save messages failed:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    if (messages.length > 1) {
      saveMessages(messages);
    }
  }, [messages, saveMessages]);

  // 进入页面时自动加载最近一次聊天记录
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('msd_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/chat/sessions?type=companion', { headers });
        if (res.ok) {
          const data = await res.json();
          const sessions = (data.sessions || []).filter((s: any) => s.type === 'companion');
          if (sessions.length > 0) {
            const latest = sessions[0];
            const msgRes = await fetch(`/api/chat/messages?session_id=${latest.id}`, { headers });
            if (msgRes.ok) {
              const msgData = await msgRes.json();
              const msgs: Message[] = (msgData.messages || []).map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                isVoice: m.is_voice || false,
              }));
              if (msgs.length > 0) {
                setSessionId(latest.id);
                setMessages(msgs);
                setRestoringHistory(false);
                return;
              }
            }
          }
        }
      } catch {
        // ignore
      }
      const hour = new Date().getHours();
      let welcomeContext = '日常';
      if (hour >= 0 && hour < 6) welcomeContext = '深夜';
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
      setRestoringHistory(false);
    })();
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { play, isPlayingMessage, isLoadingMessage, ttsRemaining, ttsLimitHit, setTtsLimitHit } = useTTS({ isCompanion: true });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // TTS额度用完弹窗
  useEffect(() => {
    if (ttsLimitHit) setShowTtsPaywall(true);
  }, [ttsLimitHit]);

  // 发送消息给AI
  const sendToAI = useCallback(async (text: string, historyMessages: Message[]) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context,
          sessionId,
          history: historyMessages.map(m => ({ role: m.role, content: m.content })),
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
            if (data === '[DONE]') {
              if (!assistantMessage.trim()) {
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantId ? { ...msg, content: '抱歉，阿搭打了个盹，请再说一遍～' } : msg
                ));
              }
              break;
            }
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
  }, [context, sessionId]);

  // 文字发送
  const sendMessage = useCallback(() => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    const userMessage: Message = { id: generateId(), role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    sendToAI(text, [...messages, userMessage]);
  }, [input, isLoading, messages, sendToAI]);

  // 语音发送：先检查额度，再STT
  const handleVoiceSend = useCallback((localUrl: string, durationMs: number) => {
    if (isLoading) return;

    // 免费用户额度为0时拦截
    if (voiceRemaining === 0) {
      setShowVoicePaywall(true);
      return;
    }

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
    setIsLoading(true);

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
          // 更新剩余次数
          if (sttData.voiceRemaining !== undefined) {
            setVoiceRemaining(sttData.voiceRemaining);
          }
          if (transcript) {
            setMessages(prev => prev.map(msg =>
              msg.id === voiceId ? { ...msg, content: transcript } : msg
            ));
            sendToAI(transcript, [...messages, { ...voiceMessage, content: transcript }]);
          } else {
            setIsLoading(false);
          }
        } else if (sttRes.status === 403) {
          // 语音额度用完
          const data = await sttRes.json();
          if (data.voiceLimit) {
            setVoiceRemaining(0);
            setShowVoicePaywall(true);
            // 移除刚添加的语音消息
            setMessages(prev => prev.filter(msg => msg.id !== voiceId));
          }
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('[Voice] STT failed:', err);
        setIsLoading(false);
      }
    })();
  }, [isLoading, messages, sendToAI, voiceRemaining]);

  const handleVoiceTranscript = useCallback((messageId: string, text: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, voiceTranscript: text } : msg
    ));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    setSessionId(generateId());
    setMessages([{
      id: 'welcome-new',
      role: 'assistant',
      content: '好的，新开一局。有什么想聊的？',
    }]);
  };

  const quickEntries = [
    { text: '面试前紧张', context: '面试前' },
    { text: '刚面试完', context: '面试后' },
    { text: '等通知焦虑', context: '等通知' },
    { text: '心情不好', context: '崩溃急救' },
  ];

  if (restoringHistory) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1A1A2E] to-[#252542] flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A2E] to-[#252542] flex flex-col">
      {/* 顶部栏 */}
      <header className="bg-[#252542] border-b border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-sm">搭</div>
            <div>
              <p className="font-medium text-white text-sm">阿搭</p>
              <p className="text-xs text-green-400">在线 · 随时都在</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={startNewChat}
              className="px-3 py-1.5 border border-gray-600 text-gray-300 hover:text-white rounded-lg text-xs"
            >
              新对话
            </button>
            <Link href="/practice">
              <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:text-white"
                >去练习面试 →</Button>
            </Link>
          </div>
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
                  if (isLoading) return;
                  setContext(entry.context);
                  const userMsg: Message = { id: generateId(), role: 'user', content: entry.text };
                  setMessages(prev => [...prev, userMsg]);
                  sendToAI(entry.text, [...messages, userMsg]);
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
          <div className="text-xs text-gray-400 py-2 px-3 bg-[#3A3A55]/50 rounded-lg border border-amber-900/30 mb-4">
            <div className="flex items-center gap-2 mb-1"><AIBadge /><span>根据《人工智能生成合成内容标识办法》标注</span></div>
            <p className="leading-relaxed">本对话内容由AI生成，仅供参考。阿搭提供的心理陪伴建议不构成专业心理咨询或治疗。</p>
          </div>
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-2`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">搭</div>
              )}
              <div className="flex flex-col gap-1 max-w-[78%]">
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
                {msg.isVoice && msg.voiceUrl ? (
                  <div className={msg.role === 'user' ? 'flex flex-col items-end gap-1' : 'flex flex-col items-start gap-1'}>
                    <VoiceMessageBubble
                      audioUrl={msg.voiceUrl}
                      durationMs={msg.voiceDurationMs || 1000}
                      isUser={msg.role === 'user'}
                      onTranscript={msg.voiceTranscript ? undefined : (text) => handleVoiceTranscript(msg.id, text)}
                    />
                    {msg.voiceTranscript && (
                      <p className="text-xs text-gray-400 max-w-[80%] px-2">{msg.voiceTranscript}</p>
                    )}
                  </div>
                ) : (
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-[#FF6B35] text-white rounded-tr-md'
                        : 'bg-[#2A2A45] text-gray-100 rounded-tl-md'
                    }`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1 mb-1"><AIBadge /></div>
                    )}
                    {msg.content}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {authUser?.avatar_url ? (
                    <img src={authUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">😊</span>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">搭</div>
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

      {/* 语音额度用完弹窗 */}
      {showVoicePaywall && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#2A2A45] rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">🎙️</div>
            <h3 className="text-white font-bold text-lg mb-2">今日免费语音已用完</h3>
            <p className="text-gray-400 text-sm mb-5">免费用户每天可发{voiceLimit}条语音，文字聊天不限。升级套餐语音无限用。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVoicePaywall(false)}
                className="flex-1 px-4 py-2.5 border border-gray-600 text-gray-300 rounded-xl text-sm hover:text-white"
              >
                用文字聊
              </button>
              <Link
                href="/pricing"
                className="flex-1 px-4 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#E55A28]"
              >
                升级套餐
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 朗读额度用完弹窗 */}
      {showTtsPaywall && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#2A2A45] rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">🔊</div>
            <h3 className="text-white font-bold text-lg mb-2">今日免费朗读已用完</h3>
            <p className="text-gray-400 text-sm mb-5">免费用户每天可听5条AI朗读，文字聊天不限。升级套餐朗读无限用。</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowTtsPaywall(false); setTtsLimitHit(false); }}
                className="flex-1 px-4 py-2.5 border border-gray-600 text-gray-300 rounded-xl text-sm hover:text-white"
              >
                关闭
              </button>
              <Link
                href="/pricing"
                className="flex-1 px-4 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-medium hover:bg-[#E55A28]"
              >
                升级套餐
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 输入框 */}
      <div className="bg-[#252542] border-t border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 items-end">
            <div className="flex flex-col items-center">
              <VoiceInput 
                onVoiceSend={handleVoiceSend} 
                disabled={isLoading || voiceRemaining === 0} 
              />
              {voiceRemaining >= 0 && (
                <span className="text-xs text-gray-500 mt-1">
                  语音 {voiceRemaining}/{voiceLimit}
                </span>
              )}
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="和阿搭聊聊..."
              className="flex-1 bg-[#1F1F35] text-white rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35] placeholder-gray-500"
              rows={1}
            />
            <Button onClick={sendMessage} disabled={!input.trim() || isLoading} isLoading={isLoading} className="self-end">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {voiceRemaining >= 0 
              ? `文字不限 · 语音${voiceRemaining}/${voiceLimit} · 朗读${ttsRemaining >= 0 ? `${ttsRemaining}/5` : '无限'}` 
              : '阿搭 24小时在线，随时陪你聊天'}
          </p>
        </div>
      </div>
    </div>
  );
}

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
