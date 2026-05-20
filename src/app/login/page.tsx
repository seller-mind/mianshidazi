'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import { LoginModal } from '@/components/LoginModal';
import { useState } from 'react';

export default function LoginPage() {
  const { isLoggedIn, refetch } = useAuthContext();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(true);

  // 已登录则跳转
  useEffect(() => {
    if (isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542]">
      <div className="max-w-md w-full p-8 bg-white dark:bg-[#252542] rounded-2xl shadow-lg text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-xl">
          搭
        </div>
        <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-2">
          面试搭子
        </h1>
        <p className="text-[#6B7280] dark:text-gray-400 mb-6">
          登录后开始模拟面试练习
        </p>

        <LoginModal
          isOpen={showLogin}
          onClose={() => router.push('/')}
          onSuccess={async () => {
            await refetch();
            router.push('/');
          }}
        />
      </div>
    </div>
  );
}
