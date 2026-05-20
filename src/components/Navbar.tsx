'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/components/AuthProvider';
import { LoginModal } from '@/components/LoginModal';

export function Navbar() {
  const { isLoggedIn, user, activePlan, logout } = useAuthContext();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#1A1A2E]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-2.5 md:py-4 flex items-center justify-between">
        {/* Logo：圆圈在上，面试搭子在下 */}
        <Link href="/" className="flex flex-col items-center gap-0.5">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-xs md:text-sm">
            搭
          </div>
          <span className="font-semibold text-[10px] md:text-base text-[#1F2937] dark:text-white leading-none">面试搭子</span>
        </Link>
        
        {/* 桌面端导航链接 */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/diagnose" className="text-sm text-[#6B7280] hover:text-[#FF6B35] transition-colors">
            紧张类型测试
          </Link>
          <Link href="/practice" className="text-sm text-[#6B7280] hover:text-[#FF6B35] transition-colors">
            模拟面试
          </Link>
          <Link href="/companion" className="text-sm text-[#6B7280] hover:text-[#FF6B35] transition-colors">
            阿搭聊天
          </Link>
          
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#6B7280]">
                {user?.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                {activePlan && <span className="ml-1 text-[#FF6B35]">· {activePlan === 'single' ? '单次' : activePlan === 'monthly' ? '月卡' : '季卡'}</span>}
              </span>
              <button onClick={logout} className="text-xs text-[#9CA3AF] hover:text-[#FF6B35] transition-colors">
                退出
              </button>
              <Link
                href="/practice"
                className="px-4 py-2 bg-[#FF6B35] text-white text-sm font-medium rounded-lg hover:bg-[#E55A28] transition-colors"
              >
                开始使用
              </Link>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="px-4 py-2 bg-[#FF6B35] text-white text-sm font-medium rounded-lg hover:bg-[#E55A28] transition-colors"
            >
              登录
            </button>
          )}
        </div>

        {/* 手机端：功能导航 + 开始按钮 平行排列 */}
        <div className="md:hidden flex items-center gap-2">
          <Link href="/diagnose" className="text-[10px] text-[#6B7280] hover:text-[#FF6B35] transition-colors">
            🔍 紧张测试
          </Link>
          <Link href="/practice" className="text-[10px] text-[#6B7280] hover:text-[#FF6B35] transition-colors">
            🎯 模拟面试
          </Link>
          <Link href="/companion" className="text-[10px] text-[#6B7280] hover:text-[#FF6B35] transition-colors">
            💬 阿搭聊天
          </Link>
          
          {isLoggedIn ? (
            <button
              onClick={logout}
              className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-[10px] text-[#6B7280] rounded-md"
            >
              退出
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="px-2.5 py-1 bg-[#FF6B35] text-white text-[10px] font-medium rounded-md"
            >
              登录
            </button>
          )}
        </div>
      </div>

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => setShowLogin(false)}
      />
    </nav>
  );
}
