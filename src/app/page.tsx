'use client';

import Link from 'next/link';
import {
  HeroSection,
  PainPointSection,
  CounterintuitiveSection,
  ProductShowcaseSection,
  PricingSection,
  Footer,
} from '@/components/landing';
import CookieConsent from '@/components/CookieConsent';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* 导航栏 - V9更新 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#1A1A2E]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-sm">
              阿
            </div>
            <span className="font-semibold text-[#1F2937] dark:text-white">面试搭子</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link href="/diagnose" className="text-sm text-[#6B7280] hover:text-[#FF6B35] transition-colors">
              紧张类型测试
            </Link>
            <Link href="/practice" className="text-sm text-[#6B7280] hover:text-[#FF6B35] transition-colors">
              模拟面试
            </Link>
            <Link href="/companion" className="text-sm text-[#6B7280] hover:text-[#FF6B35] transition-colors">
              阿搭聊天
            </Link>
            <Link 
              href="/diagnose" 
              className="px-4 py-2 bg-[#FF6B35] text-white text-sm font-medium rounded-lg hover:bg-[#E55A28] transition-colors"
            >
              开始使用
            </Link>
          </div>
        </div>
      </nav>

      {/* 五屏落地页 - V9更新 */}
      <HeroSection />
      <PainPointSection />
      <CounterintuitiveSection />
      <ProductShowcaseSection />
      <PricingSection />

      {/* 页脚 - 使用共享Footer组件 */}
      <Footer />

      {/* Cookie同意弹窗 */}
      <CookieConsent />
    </main>
  );
}
