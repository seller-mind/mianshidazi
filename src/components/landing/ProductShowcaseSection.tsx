'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

export function ProductShowcaseSection() {
  const [activeTab, setActiveTab] = useState<'diagnose' | 'practice'>('diagnose');

  return (
    <section className="py-20 px-6 bg-white dark:bg-[#1A1A2E]">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] dark:text-white mb-4">
            阿搭能帮你做什么
          </h2>
          <p className="text-lg text-[#6B7280] dark:text-gray-400">
            两个核心功能，直击面试紧张
          </p>
        </div>

        {/* Tab切换 */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 dark:bg-[#252542] rounded-xl p-1">
            <button
              onClick={() => setActiveTab('diagnose')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'diagnose'
                  ? 'bg-white dark:bg-[#374151] text-[#FF6B35] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#1F2937] dark:hover:text-white'
              }`}
            >
              紧张类型诊断
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'practice'
                  ? 'bg-white dark:bg-[#374151] text-[#FF6B35] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#1F2937] dark:hover:text-white'
              }`}
            >
              AI面试练习
            </button>
          </div>
        </div>

        {/* 诊断预览 */}
        {activeTab === 'diagnose' && (
          <div className="animate-fade-in">
            <div className="bg-gradient-to-br from-[#F9FAFB] to-orange-50 dark:from-[#252542] dark:to-[#1A1A2E] rounded-3xl p-8 border border-gray-100 dark:border-gray-800">
              {/* 模拟诊断对话 */}
              <div className="space-y-6 max-w-md">
                {/* 阿搭消息 */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
                    阿
                  </div>
                  <div className="bg-white dark:bg-[#374151] rounded-2xl rounded-tl-md p-4 shadow-sm max-w-[80%]">
                    <p className="text-[#1F2937] dark:text-white text-sm leading-relaxed">
                      我猜你面试的时候...是那种脑子一片空白，还是身体先开始抖？
                    </p>
                  </div>
                </div>

                {/* 用户选项 */}
                <div className="flex flex-wrap gap-2 ml-13">
                  {['脑子空白，想不起来', '身体先抖，心跳加速', '不敢看面试官', '都有...'].map((option, i) => (
                    <button
                      key={i}
                      className="px-4 py-2 bg-white dark:bg-[#374151] rounded-full text-sm text-[#6B7280] dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {/* 结果预览 */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-xl">
                      A
                    </div>
                    <div>
                      <p className="text-sm text-[#6B7280] dark:text-gray-400">你的紧张类型</p>
                      <p className="text-lg font-semibold text-[#1F2937] dark:text-white">脑暴型紧张</p>
                      <p className="text-sm text-[#FF6B35]">紧张指数 72%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 text-center">
                <Button>开始诊断</Button>
              </div>
            </div>
          </div>
        )}

        {/* 练习预览 */}
        {activeTab === 'practice' && (
          <div className="animate-fade-in">
            <div className="bg-gradient-to-br from-[#F9FAFB] to-orange-50 dark:from-[#252542] dark:to-[#1A1A2E] rounded-3xl p-8 border border-gray-100 dark:border-gray-800">
              {/* 模拟对话 */}
              <div className="space-y-4 max-w-md">
                {/* 阿搭消息 */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
                    阿
                  </div>
                  <div className="bg-white dark:bg-[#374151] rounded-2xl rounded-tl-md p-4 shadow-sm max-w-[80%]">
                    <p className="text-[#1F2937] dark:text-white text-sm leading-relaxed">
                      好的，那我们来模拟一下。介绍一下你自己吧，从哪里开始都行。
                    </p>
                  </div>
                </div>

                {/* 用户消息 */}
                <div className="flex gap-3 justify-end">
                  <div className="bg-[#FF6B35] text-white rounded-2xl rounded-tr-md p-4 max-w-[80%]">
                    <p className="text-sm leading-relaxed">
                      我叫小明，毕业于XX大学，之前在YY公司做产品助理...
                    </p>
                  </div>
                </div>

                {/* 阿搭追问 */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
                    阿
                  </div>
                  <div className="bg-white dark:bg-[#374151] rounded-2xl rounded-tl-md p-4 shadow-sm max-w-[80%]">
                    <p className="text-[#1F2937] dark:text-white text-sm leading-relaxed">
                      追问一下，你在YY公司最有成就感的一个项目是什么？
                    </p>
                  </div>
                </div>
              </div>

              {/* 功能特点 */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { icon: '🎯', label: '追问式练习' },
                  { icon: '📊', label: '实时反馈' },
                  { icon: '📝', label: '面试报告' },
                ].map((feature, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl mb-2">{feature.icon}</div>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400">{feature.label}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-8 text-center">
                <Button variant="outline">免费试练一次</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
