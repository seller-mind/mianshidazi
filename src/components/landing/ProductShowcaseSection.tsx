'use client';

import Link from 'next/link';

export function ProductShowcaseSection() {
  // V9 核心功能展示
  const features = [
    {
      emoji: '🔬',
      title: '紧张类型测试',
      description: '5种紧张类型，精准定位你的问题根源。不是泛泛的"放松点"，是针对性的解决方案。',
      color: 'from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20',
      tag: '灵魂功能',
    },
    {
      emoji: '🤖',
      title: '模拟面试',
      description: '5种人格可选：温柔鼓励型帮你建立信心，真实模拟型帮你适应节奏，压力挑战型帮你脱敏。',
      color: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
      tag: '核心功能',
    },
    {
      emoji: '💬',
      title: '阿搭陪伴聊天',
      description: '面试前、面试后、等通知焦虑、崩溃时刻——阿搭都在。不是AI客服，是懂行的朋友。',
      color: 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20',
      tag: '情感陪伴',
    },
    {
      emoji: '📊',
      title: '面试练习报告',
      description: '练习结束后自动生成报告：表现分 vs 真实水平、紧张偷走了多少分、下一步建议。',
      color: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      tag: '进步可见',
    },

  ];

  return (
    <section className="py-10 md:py-20 px-4 md:px-6 bg-gradient-to-b from-white to-gray-50 dark:from-[#1A1A2E] dark:to-[#252542]">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-2xl md:text-4xl font-bold text-[#1F2937] dark:text-white mb-3 md:mb-4">
            阿搭能帮你做什么？
          </h2>
          <p className="text-sm md:text-lg text-[#6B7280] dark:text-gray-400">
            帮你不再紧张，帮你从容控场
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`bg-gradient-to-br ${feature.color} rounded-2xl p-4 md:p-6 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-shadow relative`}
            >
              {/* 标签 */}
              <div className="absolute top-3 right-3 md:top-4 md:right-4">
                <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-white/80 dark:bg-[#1A1A2E]/80 text-[#FF6B35] text-[10px] md:text-xs font-medium rounded-full">
                  {feature.tag}
                </span>
              </div>

              <span className="text-2xl md:text-3xl mb-2 md:mb-4 block">{feature.emoji}</span>
              <h3 className="text-base md:text-lg font-semibold text-[#1F2937] dark:text-white mb-1.5 md:mb-2">
                {feature.title}
              </h3>
              <p className="text-xs md:text-sm text-[#6B7280] dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* 开启旅程 */}
        <div className="mt-8 md:mt-12 bg-gradient-to-br from-[#FF6B35]/5 to-[#E55A28]/5 dark:from-[#FF6B35]/5 dark:to-[#E55A28]/5 rounded-2xl p-6 md:p-8 text-center border border-[#FF6B35]/10">
          <h3 className="text-lg md:text-2xl font-bold text-[#1F2937] dark:text-white mb-2">
            开启你的模拟面试之旅
          </h3>
          <p className="text-xs md:text-sm text-[#6B7280] dark:text-gray-400 mb-5 max-w-md mx-auto">
            先测紧张类型，再和阿搭聊聊，准备好了就上模拟面试——每一步都有阿搭陪你
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
            <Link href="/diagnose">
              <button className="px-5 py-2.5 md:px-6 md:py-3 bg-[#FF6B35] text-white text-sm md:text-base font-medium rounded-xl hover:bg-[#E55A28] transition-colors shadow-md shadow-[#FF6B35]/20">
                🔍 紧张类型测试
              </button>
            </Link>
            <Link href="/companion">
              <button className="px-5 py-2.5 md:px-6 md:py-3 bg-white dark:bg-[#252542] text-[#1F2937] dark:text-white text-sm md:text-base font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2A2A45] transition-colors">
                💬 先和阿搭聊聊
              </button>
            </Link>
            <Link href="/practice">
              <button className="px-5 py-2.5 md:px-6 md:py-3 bg-white dark:bg-[#252542] text-[#1F2937] dark:text-white text-sm md:text-base font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2A2A45] transition-colors">
                🎯 模拟面试
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
