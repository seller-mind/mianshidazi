'use client';

import Link from 'next/link';
import { useAuthContext } from '@/components/AuthProvider';

export function Navbar() {
  const { isLoggedIn, user, activePlan } = useAuthContext();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  };

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      backgroundColor: 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid #F3F4F6',
    }}>
      <div style={{
        maxWidth: '1152px',
        margin: '0 auto',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textDecoration: 'none' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6B35, #E55A28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '13px',
          }}>搭</div>
          <span style={{ fontWeight: 600, fontSize: '12px', color: '#1F2937', lineHeight: 1 }}>面试搭子</span>
        </Link>
        
        {/* 桌面端 - 用CSS media query控制显示 */}
        <div className="navbar-desktop" style={{ display: 'none', alignItems: 'center', gap: '24px' }}>
          <Link href="/diagnose" style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none' }}>
            紧张类型测试
          </Link>
          <Link href="/practice" style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none' }}>
            模拟面试
          </Link>
          <Link href="/companion" style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none' }}>
            阿搭聊天
          </Link>
          
          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                {user?.email || user?.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                {activePlan && <span style={{ marginLeft: '4px', color: '#FF6B35' }}>· {activePlan === 'single' ? '单次' : activePlan === 'monthly' ? '月卡' : '季卡'}</span>}
              </span>
              <Link href="/profile" style={{ fontSize: '12px', color: '#6B7280', textDecoration: 'none' }}>
                设置
              </Link>
              <button onClick={handleLogout} style={{ fontSize: '12px', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>
                退出
              </button>
              <Link
                href="/practice"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FF6B35',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                开始使用
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              style={{
                padding: '8px 16px',
                backgroundColor: '#FF6B35',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              登录
            </Link>
          )}
        </div>

        {/* 手机端 */}
        <div className="navbar-mobile" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/practice" style={{ fontSize: '10px', color: '#6B7280', textDecoration: 'none' }}>
            🎯 模拟面试
          </Link>
          
          {isLoggedIn ? (
            <>
            <Link
              href="/profile"
              style={{
                padding: '4px 10px',
                backgroundColor: '#F3F4F6',
                fontSize: '10px',
                color: '#6B7280',
                textDecoration: 'none',
                borderRadius: '6px',
              }}
            >
              设置
            </Link>
            <button
              onClick={handleLogout}
              style={{
                padding: '4px 10px',
                backgroundColor: '#F3F4F6',
                fontSize: '10px',
                color: '#6B7280',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              退出
            </button>
            </>
          ) : (
            <Link
              href="/login"
              style={{
                padding: '4px 10px',
                backgroundColor: '#FF6B35',
                color: '#FFFFFF',
                fontSize: '10px',
                fontWeight: 500,
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
