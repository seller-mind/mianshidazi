'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import { TENSION_TYPES } from '@/lib/ai/config';
import type { TensionLevel, InterviewReport } from '@/types';

function ReportContent() {
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从localStorage读取真实报告
    const stored = localStorage.getItem('msd_report');
    if (stored) {
      try {
        setReport(JSON.parse(stored));
      } catch {
        // 数据损坏
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#FF6B35] transition-colors mb-6">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回首页
          </Link>
          <div className="bg-white dark:bg-[#252542] rounded-2xl p-8 shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h1 className="text-xl font-bold text-[#1F2937] dark:text-white mb-3">暂无报告</h1>
            <p className="text-[#6B7280] dark:text-gray-400 mb-6">完成一次模拟面试后，这里会生成你的专属练习报告</p>
            <Link href="/practice">
              <Button size="lg">开始模拟面试 →</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const typeInfo = report.tensionDiagnosis?.type ? TENSION_TYPES[report.tensionDiagnosis.type as TensionLevel] : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#FF6B35] transition-colors mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>

        {/* 一句话总结 */}
        <div className="bg-gradient-to-r from-[#FF6B35] to-[#E55A28] rounded-2xl p-6 text-white mb-6 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h1 className="text-2xl font-bold mb-2">面试练习报告</h1>
          <p className="text-white/90 text-lg" style={{ whiteSpace: 'pre-wrap' }}>
            {report.summary}
          </p>
        </div>

        {/* 分数对比 */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">📊 分数对比</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#6B7280]">你的真实水平</span>
                <span className="font-medium text-[#1F2937] dark:text-white">{report.scores?.realLevel ?? 0}分</span>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${report.scores?.realLevel ?? 0}%` }} />
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">✨ 这才是你的真实实力</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#6B7280]">面试表现分</span>
                <span className="font-medium text-[#1F2937] dark:text-white">{report.overallScore ?? 0}分</span>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#FF6B35] to-[#E55A28] rounded-full transition-all duration-1000" style={{ width: `${report.overallScore ?? 0}%` }} />
              </div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">
                😰 <span className="font-semibold">紧张偷走了你 {report.scores?.tensionLost ?? 0} 分</span>
              </p>
            </div>
          </div>
        </Card>

        {/* 亮点 */}
        {report.highlights && report.highlights.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">✨ 你本来就很厉害</h2>
            <div className="space-y-4">
              {report.highlights.map((highlight, index) => (
                <div key={index} className="border-l-4 border-green-500 pl-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-[#1F2937] dark:text-white">{highlight.question}</span>
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">+{highlight.score - 70}</span>
                  </div>
                  <p className="text-sm text-[#6B7280] dark:text-gray-400 line-clamp-2">{highlight.answer}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 紧张损失 */}
        {report.tensionLosses && report.tensionLosses.length > 0 && (
          <Card variant="highlight" className="mb-6">
            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">😰 紧张偷走了你的分数</h2>
            <div className="space-y-3">
              {report.tensionLosses.map((loss, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-red-500">-</span>
                  <div>
                    <p className="text-sm text-[#1F2937] dark:text-white">{loss.question}</p>
                    <p className="text-xs text-[#6B7280] dark:text-gray-400">{loss.reason} (-{loss.lostPoints}分)</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 紧张类型 */}
        {typeInfo && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">🧠 你的紧张类型</h2>
            <div className="flex items-start gap-4">
              <span className="text-4xl">{typeInfo.emoji}</span>
              <div>
                <h3 className="font-medium text-[#1F2937] dark:text-white">{typeInfo.name}</h3>
                <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-3">{typeInfo.description}</p>
                <div className="flex flex-wrap gap-2">
                  {typeInfo.symptoms.slice(0, 3).map((symptom, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">{symptom}</span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 建议 */}
        {report.suggestions && report.suggestions.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">🛠 下一步练习建议</h2>
            <div className="space-y-4">
              {report.suggestions.map((suggestion, index) => (
                <div key={index} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] flex items-center justify-center text-sm font-medium flex-shrink-0">{index + 1}</span>
                  <div>
                    <h4 className="font-medium text-[#1F2937] dark:text-white mb-1">{suggestion.title}</h4>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400">{suggestion.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 阿搭寄语 */}
        {report.adaMessage && (
          <Card variant="highlight" className="mb-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">搭</div>
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-white mb-2">💪 写给特别的你</h3>
                <p className="text-sm text-[#6B7280] dark:text-gray-400 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{report.adaMessage}</p>
              </div>
            </div>
          </Card>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-4">
          <Link href="/practice">
            <Button size="lg" className="w-full">再来一次练习 →</Button>
          </Link>
          <Link href="/companion">
            <Button variant="outline" size="lg" className="w-full">💬 和阿搭聊聊</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </main>
    }>
      <ReportContent />
    </Suspense>
  );
}
