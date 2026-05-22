'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PERSONA_CONFIGS } from '@/lib/ai/prompts';
import { Button, Card } from '@/components/ui';
import { useAuthContext } from '@/components/AuthProvider';
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
  const router = useRouter();
  const tensionType = (searchParams.get('type') as TensionLevel) || undefined;
  
  const [step, setStep] = useState<'select' | 'prepare' | 'interview'>('select');
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | null>(null);
  const [sessionId, setSessionId] = useState(() => generateId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [restoringHistory, setRestoringHistory] = useState(true);
  const [voiceRemaining, setVoiceRemaining] = useState<number>(-1);
  const [voiceLimit, setVoiceLimit] = useState<number>(3);
  const [showVoicePaywall, setShowVoicePaywall] = useState(false);
  const [showTtsPaywall, setShowTtsPaywall] = useState(false);
  const { user: authUser } = useAuthContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TTS
  const { play, preload, isPlayingMessage, isLoadingMessage, ttsRemaining, ttsLimitHit, setTtsLimitHit } = useTTS({ persona: selectedPersona || 'A' });

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

  // TTS额度用完弹窗
  useEffect(() => {
    if (ttsLimitHit) setShowTtsPaywall(true);
  }, [ttsLimitHit]);

  // 进入页面时自动加载最近一次面试
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('msd_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/chat/sessions?type=interview', { headers });
        if (res.ok) {
          const data = await res.json();
          const sessions = (data.sessions || []).filter((s: any) => s.type === 'interview');
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
                setSelectedPersona(latest.persona as PersonaType);
                setMessages(msgs);
                setStep('interview');
                setInterviewEnded(false); // 允许用户继续面试
                setRestoringHistory(false);
                ensureInterviewSession(latest.id, latest.persona as PersonaType);
                return;
              }
            }
          }
        }
      } catch {
        // ignore
      }
      setRestoringHistory(false);
    })();
  }, []);

  // 保存消息到Supabase
  const saveMessages = useCallback(async (msgs: Message[]) => {
    if (msgs.length === 0) return;
    try {
      const token = localStorage.getItem('msd_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      await fetch('/api/chat/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          type: 'interview',
          persona: selectedPersona,
          title: selectedPersona ? `${PERSONA_CONFIGS[selectedPersona]?.name || '模拟面试'}` : '模拟面试',
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
      console.warn('[Practice] Save messages failed:', err);
    }
  }, [sessionId, selectedPersona]);


  const ensureInterviewSession = useCallback(async (sid: string, personaKey: PersonaType) => {
    try {
      const token = localStorage.getItem('msd_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/interview-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ session_id: sid, persona: personaKey }),
      });
    } catch {
      // ignore
    }
  }, []);
  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 自动保存
  useEffect(() => {
    if (messages.length > 1 && selectedPersona) {
      saveMessages(messages);
    }
  }, [messages, saveMessages, selectedPersona]);

  // 预加载语音
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.content && msg.content.length > 10) {
        preload(msg.content, msg.id);
      }
    });
  }, [messages, preload]);

  // 开始面试
  const startInterview = async () => {
    if (!selectedPersona) return;
    
    setAuthChecking(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('msd_token') : null;
      const authHeaders: Record<string, string> = {};
      if (token) authHeaders['Authorization'] = `Bearer ${token}`;

      const meRes = await fetch('/api/auth/me', { redirect: 'follow', credentials: 'include', headers: authHeaders });
      if (meRes.redirected) {
        router.push('/login?return=/practice');
        setAuthChecking(false);
        return;
      }
      const meData = await meRes.json();
      if (!meData.user) {
        router.push('/login?return=/practice');
        setAuthChecking(false);
        return;
      }

      const subRes = await fetch('/api/subscription/check', { redirect: 'follow', credentials: 'include', headers: authHeaders });
      const subData = await subRes.json();
      
      if (!subData.canPractice) {
        setShowPaywall(true);
        setAuthChecking(false);
        return;
      }

      if (subData.plan === 'free') {
        await fetch('/api/subscription/check', { method: 'POST', redirect: 'follow', credentials: 'include', headers: authHeaders });
      }

      setStep('interview');
      ensureInterviewSession(sessionId, selectedPersona);
      
      let intro = '';
      switch (selectedPersona) {
        case 'A': intro = '你好呀，今天来做一次轻松的面试练习。准备好了吗？'; break;
        case 'B': intro = '你好，请坐。从自我介绍开始吧，1-2分钟。'; break;
        case 'C': intro = '嗯，开始吧。一分钟自我介绍，说重点。'; break;
        case 'D': intro = '行，开始。自我介绍，说重点，别废话。'; break;
        case 'E': intro = '你好，先自我介绍一下吧。对了，我们公司发展空间很大，机会很多。'; break;
      }

      setMessages([{ id: generateId(), role: 'assistant', content: intro }]);
    } catch {
      router.push('/login?return=/practice');
    } finally {
      setAuthChecking(false);
    }
  };

  // 发送消息
  const sendMessage = useCallback(async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isLoading || !selectedPersona) return;

    const userMessage: Message = { id: generateId(), role: 'user', content: msgText };
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
                  msg.id === assistantId ? { ...msg, content: '抱歉，暂时无法回复，请稍后重试。' } : msg
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
            } catch {}
          }
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `抱歉，出了点问题: ${error instanceof Error ? error.message : '请稍后重试'}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, selectedPersona, sessionId, tensionType, messages]);

  // 结束面试
  const endInterview = () => {
    if (!selectedPersona) return;
    let endMessage = '';
    switch (selectedPersona) {
      case 'A': endMessage = '练习结束，你做得很棒！我会在最后给你一份详细反馈。'; break;
      case 'B': endMessage = '好，今天的面试到这里。你有什么问题想问我吗？'; break;
      case 'C': endMessage = '今天的面试到此结束。你还有什么想补充的吗？'; break;
      case 'D': endMessage = '好了，你知道自己问题在哪了吗？刚那几个点比较犀利，但真实面试官没我毒。你能扛住我，就能扛住他们。'; break;
      case 'E': endMessage = '好，今天的面试结束了。我们会在一周内通知你。'; break;
    }
    setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: endMessage }]);
    setInterviewEnded(true);
  };

  // 生成报告
  const goToReport = async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          localStorage.setItem('msd_report', JSON.stringify(data.data));
          window.location.href = '/report';
          return;
        }
      }
      window.location.href = '/report';
    } catch {
      window.location.href = '/report';
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // 语音发送
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
          if (sttData.voiceRemaining !== undefined) {
            setVoiceRemaining(sttData.voiceRemaining);
          }
          if (transcript) {
            setMessages(prev => prev.map(msg =>
              msg.id === voiceId ? { ...msg, content: transcript } : msg
            ));
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
                    } catch {}
                  }
                }
              }
            } catch (error) {
              setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `抱歉，出了点问题: ${error instanceof Error ? error.message : '请稍后重试'}` }]);
            } finally {
              setIsLoading(false);
            }
          } else {
            setIsLoading(false);
          }
        } else if (sttRes.status === 403) {
          const data = await sttRes.json();
          if (data.voiceLimit) {
            setVoiceRemaining(0);
            setShowVoicePaywall(true);
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
  }, [isLoading, selectedPersona, sessionId, tensionType, messages]);

  // 语音转文字
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

  // 付费引导弹窗
  if (showPaywall) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-6">🎯</div>
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-3">免费体验已用完</h2>
          <p className="text-[#6B7280] dark:text-gray-400 mb-8">你已经体验过一次模拟面试啦！解锁更多练习，让面试紧张不再拖后腿。</p>
          <div className="space-y-3">
            <Link href="/pricing" className="block w-full py-3 bg-[#FF6B35] text-white rounded-xl font-medium text-lg hover:bg-[#E55A28] transition-colors">查看套餐 →</Link>
            <button onClick={() => setShowPaywall(false)} className="block w-full py-3 text-[#6B7280] hover:text-[#1F2937] dark:hover:text-white transition-colors">返回</button>
          </div>
        </div>
      </main>
    );
  }

  // 加载历史中
  if (restoringHistory) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse text-gray-400">加载中...</div>
        </div>
      </main>
    );
  }

  // 选择人格
  if (step === 'select') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#FF6B35] transition-colors mb-8">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            返回
          </Link>
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-4">选择你的面试官</h1>
            <p className="text-[#6B7280] dark:text-gray-400 mb-3">不同风格的面试官，帮你应对不同场景</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full">
              <span className="text-sm">💡</span>
              <span className="text-xs md:text-sm text-amber-700 dark:text-amber-400">第一次？推荐选「温柔鼓励型」，先找找感觉</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full mt-2">
              <span className="text-sm">🎁</span>
              <span className="text-xs md:text-sm text-green-700 dark:text-green-400">每人1次免费体验机会，紧张测试和阿搭聊天完全免费</span>
            </div>
          </div>
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
                    <h3 className="font-semibold text-[#1F2937] dark:text-white mb-1">{config.name}</h3>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-2">{config.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {config.suitableFor.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">{tag}</span>
                      ))}
                    </div>
                    {config.warning && <p className="text-xs text-red-500 mt-2">{config.warning}</p>}
                  </div>
                  {selectedPersona === key && (
                    <div className="w-6 h-6 rounded-full bg-[#FF6B35] flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-8">
            <Button size="lg" className="w-full" disabled={!selectedPersona || authChecking} onClick={startInterview}>
              {authChecking ? '检查权益中...' : selectedPersona ? `开始 ${PERSONA_CONFIGS[selectedPersona].name}` : '请先选择面试官'}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // 面试中
  return (
    <main className="min-h-screen bg-white dark:bg-[#1A1A2E] flex flex-col">
      <header className="bg-white dark:bg-[#252542] border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedPersona && PERSONA_CONFIGS[selectedPersona]?.emoji}</span>
            <div>
              <p className="font-medium text-[#1F2937] dark:text-white">{selectedPersona && PERSONA_CONFIGS[selectedPersona]?.name}</p>
              <p className="text-xs text-gray-500">AI模拟面试中</p>
            </div>
          </div>
          {!interviewEnded ? (
            <div className="flex items-center gap-2">
              <a href="/" className="text-xs text-gray-400 hover:text-[#FF6B35] transition-colors">返回</a>
              <Button variant="ghost" size="sm" onClick={endInterview}>结束面试</Button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 py-2 px-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
            <div className="flex items-center gap-2 mb-1"><AIBadge /><span>根据《人工智能生成合成内容标识办法》标注</span></div>
            <p className="leading-relaxed">本对话内容由AI生成，仅供参考。AI提供的面试建议不构成专业职业指导或心理治疗建议。</p>
          </div>
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-2`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">搭</div>
              )}
              <div className="flex flex-col gap-1 max-w-[80%]">
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
                    {msg.voiceTranscript && <p className="text-xs text-gray-400 max-w-[85%] px-2">{msg.voiceTranscript}</p>}
                  </div>
                ) : (
                <div
                  className={`px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-[#FF6B35] text-white rounded-tr-md' : 'bg-gray-100 dark:bg-[#2A2A45] text-[#1F2937] dark:text-gray-100 rounded-tl-md'}`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {msg.role === 'assistant' && <div className="flex items-center gap-1 mb-1"><AIBadge /></div>}
                  {msg.content}
                </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
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

      {/* 底部操作区 */}
      {interviewEnded ? (
        <div className="bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800 px-6 py-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-green-700 dark:text-green-400 text-sm mb-3">面试结束！恭喜你完成了一次练习</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={goToReport} disabled={isGeneratingReport}>
                {isGeneratingReport ? '正在生成报告...' : '查看面试报告 →'}
              </Button>
              <Button variant="outline" onClick={() => { setInterviewEnded(false); setMessages([]); setStep('select'); setSessionId(generateId()); }}>
                再来一次
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <footer className="bg-white dark:bg-[#252542] border-t border-gray-100 dark:border-gray-800 px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col items-center mb-2">
              <VoiceInput onVoiceSend={handleVoiceSend} disabled={isLoading || voiceRemaining === 0} />
              {voiceRemaining >= 0 && (
                <span className="text-xs text-gray-400 mt-1">语音 {voiceRemaining}/{voiceLimit} · 朗读 {ttsRemaining >= 0 ? `${ttsRemaining}/10` : '无限'}</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="也可以打字回答..."
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-[#1A1A2E] rounded-lg text-sm text-[#1F2937] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#FF6B35]"
              />
              {input.trim() && (
                <button onClick={() => sendMessage()} disabled={isLoading} className="px-3 py-2 bg-[#FF6B35] text-white rounded-lg text-sm font-medium active:scale-95 transition-transform">发送</button>
              )}
              <button onClick={endInterview} className="px-3 py-2 text-xs text-gray-400 hover:text-[#FF6B35] transition-colors">结束面试</button>
            </div>
          </div>
        </footer>
      )}
    </main>
  );
}

  // 语音额度用完弹窗 - in interview view
  // (shown as overlay on interview page)

export default function PracticePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto mb-4" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </main>
    }>
      <PracticeContent />
    </Suspense>
  );
}
