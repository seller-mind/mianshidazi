'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

export function CounterintuitiveSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const insights = [
    {
      hook: '面试前一晚睡不着',
      counterintuitive: '反而说明你会面试得更好',
      detail: '哈佛睡眠实验室研究发现，适度焦虑会提升大脑警觉度。那些前一晚睡不太好的人，面试时的反应速度反而更快。',
      reveal: '所以别因为睡不着而更焦虑，接受它，这是你的身体在帮你预热。',
    },
    {
      hook: '面试官开始追问',
      counterintuitive: '他不是在刁难你，是在给你机会',
      detail: '追问往往意味着面试官对你感兴趣，想深入了解。如果真不想要你，直接进入下一个话题就完了。',
      reveal: '下次被追问，试着把它当成"加分题"，而不是"陷阱题"。',
    },
    {
      hook: '紧张和兴奋',
      counterintuitive: '其实是同一种身体反应',
      detail: '斯坦福大学的神经科学家发现，紧张和兴奋时身体会释放同样的化学物质。区别只在于你怎么解读它。',
      reveal: '下次面试前，把"我很紧张"换成"我很兴奋"，表现会提升20%。',
    },
  ];

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-orange-50 to-white dark:from-[#252542] dark:to-[#1A1A2E]">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-sm font-medium mb-4">
            反直觉洞察
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] dark:text-white mb-4">
            那些面试官不会告诉你的事
          </h2>
          <p className="text-lg text-[#6B7280] dark:text-gray-400">
            点击查看真相
          </p>
        </div>

        {/* 洞察卡片 */}
        <div className="space-y-6">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="bg-white dark:bg-[#252542] rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800 transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[#FF6B35] font-semibold">{insight.hook}</span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="text-[#1F2937] dark:text-white font-semibold">{insight.counterintuitive}</span>
                  </div>
                  
                  {expandedIndex === index ? (
                    <div className="space-y-4 animate-fade-in">
                      <p className="text-[#6B7280] dark:text-gray-400 leading-relaxed">
                        {insight.detail}
                      </p>
                      <div className="bg-[#FF6B35]/5 dark:bg-[#FF6B35]/10 rounded-xl p-4">
                        <p className="text-[#FF6B35] font-medium">
                          {insight.reveal}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  className="text-[#FF6B35] hover:text-[#E55A28]"
                >
                  {expandedIndex === index ? '收起' : '真的吗？'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* 阿搭提示 */}
        <div className="mt-10 flex gap-4 max-w-lg mx-auto">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
            阿
          </div>
          <div className="bg-white dark:bg-[#252542] rounded-2xl rounded-tl-md p-4 shadow-lg">
            <p className="text-sm text-[#6B7280] dark:text-gray-400">
              "这些洞察来自心理学研究和真实面试经验。知道这些不是为了自我安慰，而是帮你调整心态。"
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
