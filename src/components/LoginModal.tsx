'use client';

import { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: 'send' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '发送失败'); return; }
      setStep('code');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
      }, 1000);
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) { setError('请输入6位验证码'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, action: 'verify' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '验证失败'); return; }
      onSuccess?.();
      onClose();
      setPhone(''); setCode(''); setStep('phone');
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#252542] rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-[#1F2937] dark:text-white">登录面试搭子</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] text-xl">&times;</button>
        </div>

        {step === 'phone' ? (
          <>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="请输入手机号"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1A1A2E] text-[#1F2937] dark:text-white text-sm focus:outline-none focus:border-[#FF6B35] mb-3"
              maxLength={11}
            />
            <button
              onClick={handleSendCode}
              disabled={loading || phone.length !== 11}
              className="w-full py-3 bg-[#FF6B35] text-white font-medium rounded-xl hover:bg-[#E55A28] transition-colors disabled:opacity-50"
            >
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-[#6B7280] mb-2">验证码已发送至 {phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</p>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6位验证码"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1A1A2E] text-[#1F2937] dark:text-white text-sm focus:outline-none focus:border-[#FF6B35] mb-3 text-center text-lg tracking-widest"
              maxLength={6}
              autoFocus
            />
            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full py-3 bg-[#FF6B35] text-white font-medium rounded-xl hover:bg-[#E55A28] transition-colors disabled:opacity-50"
            >
              {loading ? '验证中...' : '登录'}
            </button>
            <div className="mt-2 flex justify-between">
              <button onClick={() => { setStep('phone'); setCode(''); setError(''); }} className="text-xs text-[#6B7280] hover:text-[#FF6B35]">更换手机号</button>
              <button onClick={handleSendCode} disabled={countdown > 0} className="text-xs text-[#FF6B35] disabled:text-[#9CA3AF]">
                {countdown > 0 ? `${countdown}s` : '重发'}
              </button>
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-[#9CA3AF]">或</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        <button
          onClick={() => { window.location.href = '/api/auth/wechat'; }}
          className="w-full py-3 bg-[#07C160] text-white text-sm font-medium rounded-xl hover:bg-[#06AD56] transition-colors flex items-center justify-center gap-2"
        >
          微信扫码登录
        </button>
      </div>
    </div>
  );
}
