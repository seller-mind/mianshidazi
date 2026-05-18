'use client';

import { Button } from '@/components/ui';

export function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542]">
      <div className="max-w-3xl mx-auto text-center">
        {/* 阿搭头像占位 */}
        <div className="mb-8 animate-float">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-[#FF6B35]/30">
            阿
          </div>
          <p className="mt-3 text-[#FF6B35] font-medium">我是阿搭</p>
        </div>

        {/* 主标题 */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1F2937] dark:text-white leading-tight mb-6">
          你不是不会，
          <br />
          <span className="text-[#FF6B35]">你只是太紧张了</span>
        </h1>

        {/* 副标题 */}
        <p className="text-xl md:text-2xl text-[#6B7280] dark:text-gray-400 mb-10 max-w-xl mx-auto">
          找个面试搭子，上场不慌
        </p>

        {/* CTA按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="animate-pulse-glow">
            免费测你的紧张类型
          </Button>
          <Button variant="outline" size="lg">
            了解更多
          </Button>
        </div>

        {/* 社会证明 */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-[#9CA3AF]">
          <div className="flex items-center gap-2">
            <span className="text-[#FF6B35] font-semibold">10,000+</span>
            <span>人已诊断</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#FF6B35] font-semibold">85%</span>
            <span>紧张指数下降</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#FF6B35] font-semibold">4.9</span>
            <span>用户评分</span>
          </div>
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
