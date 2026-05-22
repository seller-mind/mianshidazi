'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

export function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-12 md:pt-20 md:pb-20 bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] relative">
      {/* 装饰背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-4 w-40 h-40 md:w-64 md:h-64 bg-[#FF6B35]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-4 w-56 h-56 md:w-96 md:h-96 bg-[#FF6B35]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto text-center relative z-10">
        {/* 阿搭头像 */}
        <div className="mb-6 md:mb-8 animate-float">
          <div className="w-16 h-16 md:w-24 md:h-24 mx-auto rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white text-2xl md:text-4xl font-bold shadow-xl shadow-[#FF6B35]/30">
            搭
          </div>
          <p className="mt-2 md:mt-3 text-sm md:text-base text-[#FF6B35] font-medium">我是阿搭，你的面试搭子</p>
        </div>

        {/* 主标题 - V9核心Slogan */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-[#1F2937] dark:text-white leading-tight mb-4 md:mb-6">
          你不是不会
          <br />
          <span className="text-[#FF6B35]">你只是太紧张了</span>
        </h1>

        {/* 副标题 */}
        <p className="text-base md:text-2xl text-[#6B7280] dark:text-gray-400 mb-6 md:mb-10 max-w-xl mx-auto">
          免费测紧张类型，先诊断再练习
        </p>

        {/* 社交证明 */}
        <div className="flex items-center justify-center gap-4 mb-6 md:mb-10">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {['🧑','👩','👨','👧','👦'].map((e, i) => (
                <div key={i} className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs md:text-sm border-2 border-white dark:border-[#1A1A2E]">{e}</div>
              ))}
            </div>
            <span className="text-xs md:text-sm text-[#6B7280] dark:text-gray-400 ml-1">10,000+ 人已测</span>
          </div>
          <span className="text-xs md:text-sm text-[#FF6B35] font-medium">⭐ 4.9 好评</span>
        </div>

        {/* 阿搭角色定位 */}
        <div className="grid grid-cols-2 gap-2 mb-6 md:mb-10 md:flex md:flex-wrap md:justify-center md:gap-3">
          {[
            { emoji: '💪', text: '面试恐惧终结者' },
            { emoji: '📚', text: '知识分享者' },
            { emoji: '🤗', text: '情感陪伴者' },
            { emoji: '👀', text: '懂行朋友' },
          ].map((item) => (
            <div
              key={item.text}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-white dark:bg-[#252542] rounded-full shadow-sm border border-gray-100 dark:border-gray-800 text-center"
            >
              <span className="mr-1">{item.emoji}</span>
              <span className="text-xs md:text-sm text-[#6B7280] dark:text-gray-400">{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-8 md:mb-12">
          <Link href="/diagnose">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              🔍 免费紧张测试
            </Button>
          </Link>
          <Link href="/companion">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              💬 先和阿搭聊聊
            </Button>
          </Link>
          <Link href="/practice">
            <Button size="lg" className="animate-pulse-glow w-full sm:w-auto">
              🎯 模拟面试
            </Button>
          </Link>
        </div>
      </div>

      {/* 向下滚动提示 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
