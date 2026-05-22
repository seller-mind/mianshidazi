'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 md:p-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#252542] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 px-4 py-3 md:px-6 md:py-4 flex flex-col sm:flex-row items-center gap-3">
        <p className="text-xs md:text-sm text-[#6B7280] dark:text-gray-400 flex-1">
          🍪 我们使用必要的Cookie来保障服务运行。继续使用即表示您同意我们的
          <Link href="/privacy" className="text-[#FF6B35] hover:underline mx-1">隐私政策</Link>
        </p>
        <button
          onClick={handleAccept}
          className="px-4 py-2 bg-[#FF6B35] text-white text-xs md:text-sm font-medium rounded-lg hover:bg-[#E55A28] transition-colors whitespace-nowrap"
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
