'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TENSION_TYPES } from '@/lib/ai/config';
import { Button, Card, TensionMeter } from '@/components/ui';
import type { TensionLevel } from '@/types';

function ReportContent() {
  const searchParams = useSearchParams();
  const tensionType = (searchParams.get('type') as TensionLevel) || 'A';
  const tensionIndex = parseInt(searchParams.get('tension') || '65', 10);
  const performanceScore = Math.max(40, 100 - tensionIndex * 0.6);

  const typeInfo = TENSION_TYPES[tensionType];

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
      <div className="max-w-2xl mx-auto">
        {/* 返回按钮 */}
        <a href="/" className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#FF6B35] transition-colors mb-8">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </a>

        {/* 报告标题 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-2">
            面试报告
          </h1>
          <p className="text-sm text-[#6B7280]">
            基于你的紧张类型，我们为你准备了专属建议
          </p>
        </div>

        {/* 紧张指数 */}
        <Card variant="highlight" className="mb-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <TensionMeter value={tensionIndex} size="lg" />
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-2">
                {typeInfo.emoji} {typeInfo.name}
              </h2>
              <p className="text-[#6B7280] dark:text-gray-400">
                {typeInfo.description}
              </p>
            </div>
          </div>
        </Card>

        {/* 表现分析 */}
        <Card className="mb-6">
          <h3 className="font-semibold text-[#1F2937] dark:text-white mb-4">表现分析</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#6B7280]">你的真实水平</span>
                <span className="font-medium text-[#1F2937] dark:text-white">{performanceScore + 20}分</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${performanceScore + 20}%` }} />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#6B7280]">面试表现分</span>
                <span className="font-medium text-[#1F2937] dark:text-white">{performanceScore}分</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full progress-gradient rounded-full" style={{ width: `${performanceScore}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">
              紧张可能导致你失去了 <span className="font-semibold">{(20 - (100 - tensionIndex - performanceScore)).toFixed(0)}</span> 分的发挥空间
            </p>
          </div>
        </Card>

        {/* 典型症状 */}
        <Card className="mb-6">
          <h3 className="font-semibold text-[#1F2937] dark:text-white mb-4">典型症状</h3>
          <ul className="space-y-3">
            {typeInfo.symptoms.map((symptom, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#6B7280] dark:text-gray-400">
                <span className="text-[#FF6B35] font-bold">·</span>
                {symptom}
              </li>
            ))}
          </ul>
        </Card>

        {/* 改善建议 */}
        <Card variant="highlight" className="mb-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
              阿
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#1F2937] dark:text-white mb-3">阿搭的建议</h3>
              <ul className="space-y-4">
                {typeInfo.advice.map((advice, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400 leading-relaxed">
                      {advice}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        {/* CTA */}
        <div className="space-y-4">
          <Button size="lg" className="w-full">
            开始针对性练习
          </Button>
          <Button variant="outline" size="lg" className="w-full">
            分享报告给好友
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] flex items-center justify-center">
        <p className="text-[#6B7280]">正在加载报告...</p>
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
