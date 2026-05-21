'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/components/AuthProvider';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNo = searchParams.get('order');
  const { refetch } = useAuthContext();
  const [status, setStatus] = useState<'checking' | 'success' | 'timeout'>('checking');
  const [countdown, setCountdown] = useState(5);

  // 轮询订单状态，最多30秒
  useEffect(() => {
    if (!orderNo) {
      setStatus('success'); // 没有订单号就直接显示成功
      return;
    }

    let attempts = 0;
    const maxAttempts = 15; // 15次 * 2秒 = 30秒

    const poll = async () => {
      attempts++;
      try {
        const token = localStorage.getItem('msd_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/payment/status?order=${orderNo}`, { headers });
        const data = await res.json();

        if (data.status === 'paid') {
          setStatus('success');
          refetch();
          return;
        }
      } catch {}

      if (attempts >= maxAttempts) {
        setStatus('timeout');
        return;
      }

      setTimeout(poll, 2000);
    };

    poll();
  }, [orderNo, refetch]);

  // 成功后自动跳转倒计时
  useEffect(() => {
    if (status !== 'success') return;
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
  }, [status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] px-4">
      <div className="max-w-md w-full p-8 bg-white dark:bg-[#252542] rounded-2xl shadow-lg text-center">
        {status === 'checking' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-3">
              正在确认支付...
            </h1>
            <p className="text-[#6B7280] dark:text-gray-400">
              请稍候，我们正在确认您的支付结果
            </p>
          </>
        )}

        {status === 'success' && (
          <>
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
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-3">
              支付确认中
            </h1>
            <p className="text-[#6B7280] dark:text-gray-400 mb-6">
              您的支付正在处理中，通常1-2分钟内到账。请稍后在模拟面试页面查看。
            </p>
            <Link
              href="/practice"
              className="inline-block w-full py-3 bg-[#FF6B35] text-white font-medium rounded-xl hover:bg-[#E55A28] transition-colors mb-3"
            >
              去模拟面试
            </Link>
            <Link
              href="/"
              className="inline-block text-sm text-[#6B7280] hover:text-[#FF6B35]"
            >
              返回首页
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

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
