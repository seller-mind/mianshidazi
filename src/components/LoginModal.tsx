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
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-[#1F2937]">登录面试搭子</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] text-2xl leading-none">&times;</button>
        </div>

        {step === 'phone' ? (
          <div>
            <label className="block text-sm text-[#6B7280] mb-1.5">手机号</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="请输入11位手机号"
              maxLength={11}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '2px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
                fontSize: '18px',
                outline: 'none',
                marginBottom: '16px',
                boxSizing: 'border-box',
                display: 'block',
              }}
            />
            <button
              onClick={handleSendCode}
              disabled={loading || phone.length !== 11}
              className="w-full py-3.5 bg-[#FF6B35] text-white font-medium rounded-xl hover:bg-[#E55A28] transition-colors disabled:opacity-50 text-base"
            >
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[#6B7280] mb-2">
              验证码已发送至 {phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
            </p>
            <label className="block text-sm text-[#6B7280] mb-1.5">验证码</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="请输入6位验证码"
              maxLength={6}
              autoFocus
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '2px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
                fontSize: '20px',
                outline: 'none',
                marginBottom: '16px',
                boxSizing: 'border-box',
                display: 'block',
                textAlign: 'center',
                letterSpacing: '0.5em',
              }}
            />
            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 bg-[#FF6B35] text-white font-medium rounded-xl hover:bg-[#E55A28] transition-colors disabled:opacity-50 text-base"
            >
              {loading ? '验证中...' : '登录'}
            </button>
            <div className="mt-3 flex justify-between">
              <button onClick={() => { setStep('phone'); setCode(''); setError(''); }} className="text-sm text-[#6B7280] hover:text-[#FF6B35]">更换手机号</button>
              <button onClick={handleSendCode} disabled={countdown > 0} className="text-sm text-[#FF6B35] disabled:text-[#9CA3AF]">
                {countdown > 0 ? `${countdown}s` : '重发'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-[#9CA3AF]">或</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={() => { window.location.href = '/api/auth/wechat'; }}
          className="w-full py-3.5 bg-[#07C160] text-white text-base font-medium rounded-xl hover:bg-[#06AD56] transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.492.492 0 0 1 .177-.554C23.028 18.352 24 16.552 24 14.545c0-3.261-3.012-5.84-7.062-5.687zm-2.68 2.678c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/></svg>
          微信扫码登录
        </button>
      </div>
    </div>
  );
}
