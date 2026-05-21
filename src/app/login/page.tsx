'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const phoneRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

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
      // 登录成功，跳转首页
      router.push('/');
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom, #FFFFFF, #FFF7ED)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6B35, #E55A28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 auto 12px',
          }}>搭</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937', margin: '0 0 4px' }}>登录面试搭子</h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>手机号验证码登录</p>
        </div>

        {step === 'phone' ? (
          <div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', fontWeight: 500 }}>手机号</div>
            {/* 用textarea替代input，绕过Tailwind preflight对input的重置 */}
            <textarea
              ref={phoneRef as any}
              rows={1}
              value={phone}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                setPhone(val);
              }}
              placeholder="请输入11位手机号"
              style={{
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
                resize: 'none',
                overflow: 'hidden',
                lineHeight: '1.5',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleSendCode}
              disabled={loading || phone.length !== 11}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: phone.length === 11 && !loading ? '#FF6B35' : '#D1D5DB',
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: 600,
                cursor: phone.length === 11 && !loading ? 'pointer' : 'default',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
              验证码已发送至 <span style={{ fontWeight: 600, color: '#1F2937' }}>{phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', fontWeight: 500 }}>验证码</div>
            <textarea
              rows={1}
              value={code}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
              }}
              placeholder="请输入6位验证码"
              autoFocus
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: '2px solid #9CA3AF',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
                fontSize: '24px',
                outline: 'none',
                marginBottom: '16px',
                boxSizing: 'border-box',
                resize: 'none',
                overflow: 'hidden',
                lineHeight: '1.5',
                textAlign: 'center',
                letterSpacing: '8px',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: code.length === 6 && !loading ? '#FF6B35' : '#D1D5DB',
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: 600,
                cursor: code.length === 6 && !loading ? 'pointer' : 'default',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {loading ? '验证中...' : '登录'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button
                onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                style={{ fontSize: '14px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                更换手机号
              </button>
              <button
                onClick={handleSendCode}
                disabled={countdown > 0}
                style={{ fontSize: '14px', color: countdown > 0 ? '#9CA3AF' : '#FF6B35', background: 'none', border: 'none', cursor: countdown > 0 ? 'default' : 'pointer' }}
              >
                {countdown > 0 ? `${countdown}s后重发` : '重发验证码'}
              </button>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#EF4444', fontSize: '14px', textAlign: 'center', marginTop: '16px' }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
          <span style={{ fontSize: '13px', color: '#9CA3AF' }}>或</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
        </div>

        <button
          onClick={() => { window.location.href = '/api/auth/wechat'; }}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: '#07C160',
            color: '#FFFFFF',
            fontSize: '18px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          微信扫码登录
        </button>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={() => router.push('/')}
            style={{ fontSize: '14px', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← 返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
