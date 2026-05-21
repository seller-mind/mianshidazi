'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入正确的邮箱地址');
      return;
    }

    if (!password || password.length < 6) {
      setError('密码至少6位');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'login' ? { email, password } : { email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '操作失败');
        return;
      }

      // 登录/注册成功，跳转首页
      router.push('/');
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
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
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6B35, #E55A28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold',
            margin: '0 auto 12px',
          }}>搭</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937', margin: '0 0 4px' }}>
            {mode === 'login' ? '登录面试搭子' : '注册面试搭子'}
          </h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
            {mode === 'login' ? '邮箱密码登录' : '创建账号开始使用'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 邮箱 */}
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', fontWeight: 500 }}>邮箱</div>
          <textarea
            rows={1}
            value={email}
            onChange={e => setEmail(e.target.value.trim())}
            placeholder="your@email.com"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: '12px',
              border: '2px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#1F2937',
              fontSize: '16px', outline: 'none', marginBottom: '16px',
              boxSizing: 'border-box', resize: 'none', overflow: 'hidden',
              lineHeight: '1.5', fontFamily: 'inherit',
            }}
          />

          {/* 密码 */}
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', fontWeight: 500 }}>密码</div>
          <textarea
            rows={1}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="至少6位"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: '12px',
              border: '2px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#1F2937',
              fontSize: '16px', outline: 'none', marginBottom: '16px',
              boxSizing: 'border-box', resize: 'none', overflow: 'hidden',
              lineHeight: '1.5', fontFamily: 'inherit',
            }}
          />

          {/* 注册时确认密码 */}
          {mode === 'register' && (
            <>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', fontWeight: 500 }}>确认密码</div>
              <textarea
                rows={1}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: '12px',
                  border: '2px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#1F2937',
                  fontSize: '16px', outline: 'none', marginBottom: '16px',
                  boxSizing: 'border-box', resize: 'none', overflow: 'hidden',
                  lineHeight: '1.5', fontFamily: 'inherit',
                }}
              />
            </>
          )}

          {/* 错误提示 */}
          {error && <div style={{ color: '#EF4444', fontSize: '14px', textAlign: 'center', marginBottom: '12px' }}>{error}</div>}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
              backgroundColor: loading ? '#D1D5DB' : '#FF6B35', color: '#FFFFFF',
              fontSize: '18px', fontWeight: 600, cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        {/* 切换登录/注册 */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6B7280' }}>
          {mode === 'login' ? (
            <>还没有账号？<button onClick={() => { setMode('register'); setError(''); }} style={{ color: '#FF6B35', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>注册</button></>
          ) : (
            <>已有账号？<button onClick={() => { setMode('login'); setError(''); }} style={{ color: '#FF6B35', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>登录</button></>
          )}
        </div>

        {/* 返回首页 */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
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
