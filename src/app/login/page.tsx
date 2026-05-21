'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type LoginMode = 'email' | 'phone';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('email');
  const [isRegister, setIsRegister] = useState(false);

  // 邮箱登录
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 手机登录
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 邮箱密码提交
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入正确的邮箱地址'); return;
    }
    if (!password || password.length < 6) {
      setError('密码至少6位'); return;
    }
    if (isRegister && password !== confirmPassword) {
      setError('两次密码不一致'); return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '操作失败'); return; }
      router.push('/');
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { setError('请输入正确的手机号'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: 'send' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '发送失败'); return; }
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
      }, 1000);
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  // 手机验证码提交
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^1[3-9]\d{9}$/.test(phone)) { setError('请输入正确的手机号'); return; }
    if (!/^\d{6}$/.test(smsCode)) { setError('请输入6位验证码'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: 'verify', code: smsCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '验证失败'); return; }
      router.push('/');
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    border: '2px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#1F2937',
    fontSize: '16px', outline: 'none', marginBottom: '12px',
    boxSizing: 'border-box', resize: 'none', overflow: 'hidden',
    lineHeight: '1.5', fontFamily: 'inherit',
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
    backgroundColor: '#FF6B35', color: '#FFFFFF', fontSize: '16px',
    fontWeight: 600, cursor: 'pointer',
  };

  const btnDisabled: React.CSSProperties = {
    ...btnPrimary, backgroundColor: '#D1D5DB', cursor: 'default',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(to bottom, #FFFFFF, #FFF7ED)',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6B35, #E55A28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold',
            margin: '0 auto 12px',
          }}>搭</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>登录面试搭子</h1>
        </div>

        {/* 切换标签 */}
        <div style={{ display: 'flex', marginBottom: '24px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #E5E7EB' }}>
          <button
            onClick={() => { setMode('email'); setError(''); }}
            style={{
              flex: 1, padding: '12px', border: 'none', fontSize: '15px', fontWeight: 600,
              backgroundColor: mode === 'email' ? '#FF6B35' : '#FFFFFF',
              color: mode === 'email' ? '#FFFFFF' : '#6B7280',
              cursor: 'pointer',
            }}
          >邮箱登录</button>
          <button
            onClick={() => { setMode('phone'); setError(''); }}
            style={{
              flex: 1, padding: '12px', border: 'none', fontSize: '15px', fontWeight: 600,
              backgroundColor: mode === 'phone' ? '#FF6B35' : '#FFFFFF',
              color: mode === 'phone' ? '#FFFFFF' : '#6B7280',
              cursor: 'pointer',
            }}
          >手机登录</button>
        </div>

        {mode === 'email' ? (
          <form onSubmit={handleEmailSubmit}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: 500 }}>邮箱</div>
            <textarea rows={1} value={email} onChange={e => setEmail(e.target.value.trim())}
              placeholder="your@email.com" style={inputStyle} />

            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: 500 }}>密码</div>
            <textarea rows={1} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="至少6位" style={inputStyle} />

            {isRegister && (
              <>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: 500 }}>确认密码</div>
                <textarea rows={1} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码" style={inputStyle} />
              </>
            )}

            {error && <div style={{ color: '#EF4444', fontSize: '14px', textAlign: 'center', marginBottom: '12px' }}>{error}</div>}

            <button type="submit" disabled={loading} style={loading ? btnDisabled : btnPrimary}>
              {loading ? '请稍候...' : isRegister ? '注册' : '登录'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#6B7280' }}>
              {isRegister ? (
                <>已有账号？<button onClick={() => { setIsRegister(false); setError(''); }} style={{ color: '#FF6B35', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>登录</button></>
              ) : (
                <>还没有账号？<button onClick={() => { setIsRegister(true); setError(''); }} style={{ color: '#FF6B35', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>注册</button></>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={handlePhoneSubmit}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: 500 }}>手机号</div>
            <textarea rows={1} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="请输入11位手机号" maxLength={11} style={inputStyle} />

            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: 500 }}>验证码</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <textarea rows={1} value={smsCode} onChange={e => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6位验证码" maxLength={6} style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0 || loading || phone.length !== 11}
                style={{
                  padding: '14px 16px', borderRadius: '12px', border: 'none',
                  backgroundColor: countdown > 0 || phone.length !== 11 ? '#D1D5DB' : '#FF6B35',
                  color: '#FFFFFF', fontSize: '14px', fontWeight: 600, cursor: countdown > 0 ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>

            {error && <div style={{ color: '#EF4444', fontSize: '14px', textAlign: 'center', marginBottom: '12px' }}>{error}</div>}

            <button type="submit" disabled={loading} style={loading ? btnDisabled : btnPrimary}>
              {loading ? '请稍候...' : '登录'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => router.push('/')} style={{ fontSize: '14px', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← 返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
