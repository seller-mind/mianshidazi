'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { TENSION_TYPES } from '@/lib/ai/config';
import type { TensionLevel, InterviewReport } from '@/types';

function ReportContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  
  // 模拟报告数据（V9版格式）
  const [report] = useState<InterviewReport>({
    sessionId: sessionId || 'demo',
    summary: '你本可以得85分。紧张偷走了你22分。你的真实水平：85分。',
    overallScore: 63,
    tensionIndex: 37,
    scores: {
      overall: 63,
      actualScore: 85,
      realLevel: 85,
      tensionLost: 22,
      content: 78,
      expression: 65,
      confidence: 55,
    },
    highlights: [
      {
        question: '自我介绍',
        answer: '我叫张三，毕业于XX大学计算机专业，之前在XX公司做后端开发...',
        score: 82,
      },
      {
        question: '项目经历',
        answer: '我负责的用户中心重构项目，将接口响应时间从500ms优化到150ms...',
        score: 88,
      },
    ],
    improvements: [
      '回答逻辑可以更清晰，用STAR法则组织',
      '被追问时先停顿3秒再回答',
      '眼神要更坚定，不要飘忽',
    ],
    tensionLosses: [
      {
        question: '优点缺点问题',
        reason: '过度紧张导致回答不流畅',
        lostPoints: 8,
      },
      {
        question: '职业规划问题',
        reason: '停顿时间过长，思考太久',
        lostPoints: 6,
      },
    ],
    tensionAnalysis: {
      totalSignals: 5,
      criticalSignals: 2,
      dominantType: 'length',
      tips: [
        '练习4-7-8呼吸法',
        '准备过渡句争取思考时间',
        '多练习几轮降低紧张感',
      ],
    },
    tensionDiagnosis: {
      overallScore: 63,
      signals: [],
      dominantType: 'length',
      tips: ['练习4-7-8呼吸法'],
      type: 'A' as TensionLevel,
      tensionIndex: 37,
      typeName: '脑暴型紧张',
      description: '想法太多说不出来',
      suggestions: [
        '面试前做冥想放松',
        '准备万能开头应对大脑空白',
      ],
    },
    suggestions: [
      {
        priority: 1,
        title: '学习4-7-8呼吸法',
        description: '面试前深呼吸，吸气4秒、屏气7秒、呼气8秒，重复3次可以快速放松',
      },
      {
        priority: 2,
        title: '练习过渡句',
        description: '准备一些"争取时间"的话术，如"这个问题很有意思，让我想想"',
      },
      {
        priority: 3,
        title: '多练习几轮',
        description: '面试是熟能生巧的事，建议再练习3-5次，逐步降低紧张感',
      },
    ],
    adaMessage: '今天的练习很棒！你其实比自己想象的厉害。记住这种感觉，下次面试就按照今天的状态来。紧张是什么？不存在的。',
    createdAt: new Date().toISOString(),
  });

  const typeInfo = report.tensionDiagnosis?.type ? TENSION_TYPES[report.tensionDiagnosis.type] : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
      <div className="max-w-2xl mx-auto">
        {/* 返回按钮 */}
        <Link href="/" className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#FF6B35] transition-colors mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>

        {/* 🎯 一句话总结 - V9核心 */}
        <div className="bg-gradient-to-r from-[#FF6B35] to-[#E55A28] rounded-2xl p-6 text-white mb-6 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h1 className="text-2xl font-bold mb-2">面试练习报告</h1>
          <p className="text-white/90 text-lg" style={{ whiteSpace: 'pre-wrap' }}>
            {report.summary}
          </p>
        </div>

        {/* 📊 表现分 vs 真实水平 */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">📊 分数对比</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#6B7280]">你的真实水平</span>
                <span className="font-medium text-[#1F2937] dark:text-white">{report.scores?.realLevel}分</span>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${report.scores?.realLevel}%` }}
                />
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">✨ 这才是你的真实实力</p>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#6B7280]">面试表现分</span>
                <span className="font-medium text-[#1F2937] dark:text-white">{report.overallScore}分</span>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FF6B35] to-[#E55A28] rounded-full transition-all duration-1000"
                  style={{ width: `${report.overallScore}%` }}
                />
              </div>
            </div>
            
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">
                😰 <span className="font-semibold">紧张偷走了你 {report.scores?.tensionLost} 分</span>
              </p>
            </div>
          </div>
        </Card>

        {/* ✨ 你本来就很厉害 */}
        {report.highlights && report.highlights.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">✨ 你本来就很厉害</h2>
            <div className="space-y-4">
              {report.highlights.map((highlight, index) => (
                <div key={index} className="border-l-4 border-green-500 pl-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-[#1F2937] dark:text-white">
                      {highlight.question}
                    </span>
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                      +{highlight.score - 70}
                    </span>
                  </div>
                  <p className="text-sm text-[#6B7280] dark:text-gray-400 line-clamp-2">
                    {highlight.answer}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 😰 紧张偷走了你的分数 */}
        {report.tensionLosses && report.tensionLosses.length > 0 && (
          <Card variant="highlight" className="mb-6">
            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">😰 紧张偷走了你的分数</h2>
            <div className="space-y-3">
              {report.tensionLosses.map((loss, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-red-500">-</span>
                  <div>
                    <p className="text-sm text-[#1F2937] dark:text-white">
                      {loss.question}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-gray-400">
                      {loss.reason} (-{loss.lostPoints}分)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 🧠 你的紧张类型 */}
        {typeInfo && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">
              🧠 你的紧张类型
            </h2>
            <div className="flex items-start gap-4">
              <span className="text-4xl">{typeInfo.emoji}</span>
              <div>
                <h3 className="font-medium text-[#1F2937] dark:text-white">{typeInfo.name}</h3>
                <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-3">{typeInfo.description}</p>
                <div className="flex flex-wrap gap-2">
                  {typeInfo.symptoms.slice(0, 3).map((symptom, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 🛠 下一步练习建议 */}
        {report.suggestions && report.suggestions.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-4">🛠 下一步练习建议</h2>
            <div className="space-y-4">
              {report.suggestions.map((suggestion, index) => (
                <div key={index} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="font-medium text-[#1F2937] dark:text-white mb-1">
                      {suggestion.title}
                    </h4>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 💪 写给特别的你 - V9新增 */}
        <Card variant="highlight" className="mb-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
              阿
            </div>
            <div>
              <h3 className="font-semibold text-[#1F2937] dark:text-white mb-2">💪 写给特别的你</h3>
              <p className="text-sm text-[#6B7280] dark:text-gray-400 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                {report.adaMessage}
              </p>
            </div>
          </div>
        </Card>

        {/* CTA按钮 */}
        <div className="flex flex-col gap-4">
          <Link href="/practice">
            <Button size="lg" className="w-full">
              再来一次练习 →
            </Button>
          </Link>
          <Link href="/companion">
            <Button variant="outline" size="lg" className="w-full">
              💬 和阿搭聊聊
            </Button>
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
