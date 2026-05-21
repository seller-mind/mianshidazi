'use client';

import { useState, useRef, useEffect } from 'react';

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
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && step === 'phone' && phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
    if (isOpen && step === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [isOpen, step]);

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

  const inputBaseStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #9CA3AF',
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    fontSize: '18px',
    outline: 'none',
    marginBottom: '16px',
    boxSizing: 'border-box',
    display: 'block',
    minHeight: '52px',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>登录面试搭子</h2>
          <button onClick={onClose} style={{ fontSize: '28px', color: '#374151', background: '#F3F4F6', border: 'none', cursor: 'pointer', lineHeight: 1, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
        </div>

        {step === 'phone' ? (
          <div>
            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>手机号</div>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                ref={phoneInputRef}
                type="text"
                inputMode="numeric"
                value={phone}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setPhone(val);
                }}
                placeholder="请输入11位手机号"
                maxLength={11}
                style={{
                  ...inputBaseStyle,
                  marginBottom: 0,
                  color: phone ? '#1F2937' : '#6B7280',
                }}
              />
              {phone.length > 0 && (
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: phone.length === 11 ? '#10B981' : '#9CA3AF' }}>
                  {phone.length}/11
                </div>
              )}
            </div>
            <button
              onClick={handleSendCode}
              disabled={loading || phone.length !== 11}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: phone.length === 11 && !loading ? '#FF6B35' : '#D1D5DB',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 500,
                cursor: phone.length === 11 && !loading ? 'pointer' : 'default',
              }}
            >
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              验证码已发送至 <span style={{ fontWeight: 600 }}>{phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>
            </div>
            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>验证码</div>
            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              value={code}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
              }}
              placeholder="请输入6位验证码"
              maxLength={6}
              autoFocus
              style={{
                ...inputBaseStyle,
                textAlign: 'center',
                letterSpacing: '8px',
                marginBottom: 0,
              }}
            />
            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              style={{
                width: '100%',
                padding: '14px',
                marginTop: '16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: code.length === 6 && !loading ? '#FF6B35' : '#D1D5DB',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 500,
                cursor: code.length === 6 && !loading ? 'pointer' : 'default',
              }}
            >
              {loading ? '验证中...' : '登录'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <button onClick={() => { setStep('phone'); setCode(''); setError(''); }} style={{ fontSize: '14px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>更换手机号</button>
              <button onClick={handleSendCode} disabled={countdown > 0} style={{ fontSize: '14px', color: countdown > 0 ? '#9CA3AF' : '#FF6B35', background: 'none', border: 'none', cursor: countdown > 0 ? 'default' : 'pointer' }}>
                {countdown > 0 ? `${countdown}s` : '重发'}
              </button>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#EF4444', fontSize: '14px', textAlign: 'center', marginTop: '12px' }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
          <span style={{ fontSize: '13px', color: '#9CA3AF' }}>或</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
        </div>

        <button
          onClick={() => { window.location.href = '/api/auth/wechat'; }}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: '#07C160',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.492.492 0 0 1 .177-.554C23.028 18.352 24 16.552 24 14.545c0-3.261-3.012-5.84-7.062-5.687zm-2.68 2.678c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/></svg>
          微信扫码登录
        </button>
      </div>
    </div>
  );
}
