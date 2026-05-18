'use client';

import Link from 'next/link';
import {
  HeroSection,
  PainPointSection,
  CounterintuitiveSection,
  ProductShowcaseSection,
  PricingSection,
} from '@/components/landing';

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
              免费诊断
            </Link>
            <Link href="/practice" className="text-sm text-[#6B7280] hover:text-[#FF6B35] transition-colors">
              AI练习
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

      {/* 页脚 */}
      <footer className="bg-[#1A1A2E] text-gray-400 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-sm">
                阿
              </div>
              <span className="font-semibold text-white">面试搭子</span>
            </div>
            
            <div className="flex gap-6 text-sm">
              <Link href="/diagnose" className="hover:text-white transition-colors">紧张类型诊断</Link>
              <Link href="/practice" className="hover:text-white transition-colors">AI面试练习</Link>
              <Link href="/companion" className="hover:text-white transition-colors">阿搭聊天</Link>
              <Link href="/report" className="hover:text-white transition-colors">面试报告</Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2025 面试搭子 mianshidazi.com. All rights reserved.</p>
            <p className="mt-2 text-xs text-gray-500">
              阿搭说的每句话，都有真实的来源
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
