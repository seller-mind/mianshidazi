'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

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
      setStep('code');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
      }, 1000);
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(smsCode)) { setError('请输入6位验证码'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: 'verify', code: smsCode, ref: localStorage.getItem('msd_ref') || '' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '验证失败'); return; }
      // 存token到localStorage，备用认证方式
      if (data.token) {
        localStorage.setItem('msd_token', data.token);
        localStorage.removeItem('msd_ref');
      }
      const returnUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('return') : null;
      router.push(returnUrl || '/practice');
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '16px', borderRadius: '12px',
    border: '2px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#1F2937',
    fontSize: '18px', outline: 'none', marginBottom: '16px',
    boxSizing: 'border-box', resize: 'none', overflow: 'hidden',
    lineHeight: '1.5', fontFamily: 'inherit',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(to bottom, #FFFFFF, #FFF7ED)',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6B35, #E55A28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold',
            margin: '0 auto 12px',
          }}>搭</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>登录面试搭子</h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '4px 0 0' }}>手机验证码登录</p>
        </div>

        {step === 'phone' ? (
          <div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', fontWeight: 500 }}>手机号</div>
            <textarea rows={1} value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="请输入11位手机号" maxLength={11} style={inputStyle} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#FF6B35' }}
              />
              <span style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }}>
                登录即表示您同意
                <a href="/privacy" target="_blank" style={{ color: '#FF6B35', textDecoration: 'none' }}>《隐私政策》</a>
                和
                <a href="/terms" target="_blank" style={{ color: '#FF6B35', textDecoration: 'none' }}>《用户协议》</a>
              </span>
            </div>
            <button onClick={handleSendCode} disabled={loading || phone.length !== 11 || !agreed}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                backgroundColor: phone.length === 11 && agreed && !loading ? '#FF6B35' : '#D1D5DB',
                color: '#FFFFFF', fontSize: '18px', fontWeight: 600,
                cursor: phone.length === 11 && agreed && !loading ? 'pointer' : 'default',
              }}>
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
              验证码已发送至 <span style={{ fontWeight: 600, color: '#1F2937' }}>{phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', fontWeight: 500 }}>验证码</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <textarea rows={1} value={smsCode}
                onChange={e => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6位验证码" maxLength={6}
                style={{ ...inputStyle, flex: 1, marginBottom: 0, textAlign: 'center', letterSpacing: '8px' }} />
              <button type="button" onClick={handleSendCode} disabled={countdown > 0 || loading}
                style={{
                  padding: '16px', borderRadius: '12px', border: 'none',
                  backgroundColor: countdown > 0 ? '#D1D5DB' : '#FF6B35',
                  color: '#FFFFFF', fontSize: '14px', fontWeight: 600,
                  cursor: countdown > 0 ? 'default' : 'pointer', whiteSpace: 'nowrap',
                }}>
                {countdown > 0 ? `${countdown}s` : '重发'}
              </button>
            </div>
            <button onClick={handleVerify} disabled={loading || smsCode.length !== 6}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                backgroundColor: smsCode.length === 6 && !loading ? '#FF6B35' : '#D1D5DB',
                color: '#FFFFFF', fontSize: '18px', fontWeight: 600,
                cursor: smsCode.length === 6 && !loading ? 'pointer' : 'default',
              }}>
              {loading ? '验证中...' : '登录'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button onClick={() => { setStep('phone'); setSmsCode(''); setError(''); }}
                style={{ fontSize: '14px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>
                更换手机号
              </button>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#EF4444', fontSize: '14px', textAlign: 'center', marginTop: '12px' }}>{error}</div>}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => router.push('/')} style={{ fontSize: '14px', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← 返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
