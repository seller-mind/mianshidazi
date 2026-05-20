'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/components/AuthProvider';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNo = searchParams.get('order');
  const { refetch } = useAuthContext();
  const [countdown, setCountdown] = useState(5);

  // 刷新用户状态（获取最新订阅）
  useEffect(() => {
    refetch();
  }, [refetch]);

  // 自动跳转倒计时
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/practice';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] px-4">
      <div className="max-w-md w-full p-8 bg-white dark:bg-[#252542] rounded-2xl shadow-lg text-center">
        {/* 成功图标 */}
        <div className="w-16 h-16 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-3">
          支付成功！
        </h1>

        <p className="text-[#6B7280] dark:text-gray-400 mb-2">
          权益已到账，可以开始模拟面试了
        </p>

        {orderNo && (
          <p className="text-xs text-[#9CA3AF] mb-6">
            订单号：{orderNo}
          </p>
        )}

        <Link
          href="/practice"
          className="inline-block w-full py-3 bg-[#FF6B35] text-white font-medium rounded-xl hover:bg-[#E55A28] transition-colors mb-3"
        >
          立即开始模拟面试
        </Link>

        <p className="text-xs text-[#9CA3AF]">
          {countdown}秒后自动跳转...
        </p>
      </div>
    </div>
  );
}

import { Suspense } from 'react';

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse">
          <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="h-6 bg-gray-200 rounded w-32 mx-auto" />
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
