'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DIAGNOSTIC_QUESTIONS, TENSION_TYPES, calculateDiagnosticResult } from '@/lib/ai/config';
import { Button, ProgressIndicator, Card } from '@/components/ui';
import type { TensionLevel } from '@/types';

export default function DiagnosePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(DIAGNOSTIC_QUESTIONS.length).fill(null));
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<{
    primaryType: TensionLevel;
    tensionIndex: number;
    scores: Record<TensionLevel, number>;
  } | null>(null);

  const currentQuestion = DIAGNOSTIC_QUESTIONS[currentStep];

  const handleSelectOption = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentStep] = optionIndex;
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentStep < DIAGNOSTIC_QUESTIONS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        const diagnosticResult = calculateDiagnosticResult(
          newAnswers.filter(a => a !== null).map(a => [a!])
        );
        setResult(diagnosticResult);
        setIsComplete(true);
      }
    }, 500);
  };

  const handleGoToPractice = () => {
    if (result) {
      router.push(`/practice?type=${result.primaryType}&tension=${result.tensionIndex}`);
    } else {
      router.push('/practice');
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers(new Array(DIAGNOSTIC_QUESTIONS.length).fill(null));
    setIsComplete(false);
    setResult(null);
  };

  if (isComplete && result) {
    const typeInfo = TENSION_TYPES[result.primaryType];
    // 面试表现分：紧张越低表现越好（45~88区间）
    const performanceScore = Math.max(45, Math.min(88, Math.round(92 - result.tensionIndex * 0.5)));
    // 紧张偷走的分数
    const scoreLost = Math.round(result.tensionIndex * 0.22);
    // 真实水平 = 表现分 + 紧张偷走的分数
    const realLevel = Math.min(100, performanceScore + scoreLost);

    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-2xl mx-auto">
          {/* 完成提示 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              诊断完成
            </div>
            <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">
              你好，{typeInfo.emoji} {typeInfo.name}
            </h1>
            <p className="text-[#6B7280] dark:text-gray-400">
              {typeInfo.description}
            </p>
          </div>

          {/* 紧张指数 */}
          <Card variant="highlight" className="mb-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* 仪表盘 */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-[135deg]" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8"
                      className="text-gray-200 dark:text-gray-700"
                      strokeDasharray={`${270 * 0.75} ${300}`} strokeLinecap="round"
                    />
                    <circle
                      cx="50" cy="50" r="42" fill="none" stroke="url(#resultGradient)" strokeWidth="8"
                      strokeDasharray={`${(result.tensionIndex / 100) * 270 * 0.75} ${300}`}
                      strokeLinecap="round" className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="resultGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="100%" stopColor="#F87171" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-[#1F2937] dark:text-white">{result.tensionIndex}</span>
                    <span className="text-sm text-gray-500">紧张指数</span>
                  </div>
                </div>
              </div>

              {/* 分数对比 */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#6B7280]">你的真实水平</span>
                    <span className="font-medium text-[#1F2937] dark:text-white">{realLevel}分</span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${realLevel}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#6B7280]">面试表现分</span>
                    <span className="font-medium text-[#1F2937] dark:text-white">{performanceScore}分</span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full progress-gradient rounded-full" style={{ width: `${performanceScore}%` }} />
                  </div>
                </div>
                <p className="text-sm text-[#EF4444]">
                  紧张偷走了你 {Math.round(scoreLost)} 分
                </p>
              </div>
            </div>
          </Card>

          {/* 症状列表 */}
          <Card className="mb-6">
            <h3 className="font-semibold text-[#1F2937] dark:text-white mb-4">你的典型症状</h3>
            <ul className="space-y-2">
              {typeInfo.symptoms.map((symptom, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#6B7280] dark:text-gray-400">
                  <span className="text-[#FF6B35]">•</span>
                  {symptom}
                </li>
              ))}
            </ul>
          </Card>

          {/* 常见问题 FAQ - SEO */}
          <Card className="mb-6">
            <h3 className="font-semibold text-[#1F2937] dark:text-white mb-4">关于面试紧张的常见问题</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-[#1F2937] dark:text-white">面试紧张正常吗？</p>
                <p className="text-[#6B7280] dark:text-gray-400 mt-1">非常正常。面试紧张是人体面对压力时的自然应激反应，适度紧张甚至能提升注意力。关键是要了解自己的紧张类型，找到合适的应对方式。</p>
              </div>
              <div>
                <p className="font-medium text-[#1F2937] dark:text-white">面试紧张和面试焦虑有什么区别？</p>
                <p className="text-[#6B7280] dark:text-gray-400 mt-1">面试紧张是短期的、情境性的，面试结束后会缓解。面试焦虑是持续的、过度的担忧，可能影响日常生活。如果你的紧张感严重影响正常功能，建议寻求专业帮助。</p>
              </div>
              <div>
                <p className="font-medium text-[#1F2937] dark:text-white">怎么快速缓解面试紧张？</p>
                <p className="text-[#6B7280] dark:text-gray-400 mt-1">最有效的方法是提前进行模拟面试练习，让自己熟悉面试场景。了解自己的紧张类型也很重要，不同类型需要不同的应对策略。语音模拟面试能帮助你"脱敏"，练多了就不怕了。</p>
              </div>
              <div>
                <p className="font-medium text-[#1F2937] dark:text-white">面试紧张到说不出话怎么办？</p>
                <p className="text-[#6B7280] dark:text-gray-400 mt-1">这通常是"脑暴型紧张"的表现——脑子里有很多想法但说不出来。可以尝试先说一句过渡话（"这个问题很好，让我想想"），给自己几秒钟组织语言。长期来说，语音模拟面试练习能有效改善。</p>
              </div>
              <div>
                <p className="font-medium text-[#1F2937] dark:text-white">面试前紧张睡不着怎么办？</p>
                <p className="text-[#6B7280] dark:text-gray-400 mt-1">白天充分练习可以增强信心，减少睡前的焦虑。睡前避免反复回忆面试可能的问题，可以听轻音乐或做放松活动。记住：练得越多，越有底气，也就越容易入睡。</p>
              </div>
            </div>
          </Card>

          {/* 分享按钮 */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => {
                const shareText = `我的面试紧张类型是${typeInfo.emoji} ${typeInfo.name}！紧张指数${result.tensionIndex}，你呢？免费测→面试搭子 mianshidazi.com`;
                if (navigator.share) {
                  navigator.share({ title: '面试紧张类型测试结果', text: shareText, url: 'https://www.mianshidazi.com/diagnose' }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(shareText).then(() => alert('已复制，粘贴发给朋友吧！'));
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-50 dark:bg-orange-900/20 text-[#FF6B35] rounded-xl text-sm font-medium hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              分享给朋友测一测
            </button>
          </div>

          {/* CTA按钮 */}
          <div className="flex flex-col gap-4">
            <Button size="lg" className="w-full" onClick={handleGoToPractice}>
              开始模拟面试
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleRestart}>
              重新诊断
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
      <div className="max-w-2xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#FF6B35] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <ProgressIndicator current={currentStep} total={DIAGNOSTIC_QUESTIONS.length} />
        </div>

        {/* 对话式问题 */}
        <div className="min-h-[70vh] flex flex-col justify-center">
          <div className="space-y-8">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0 animate-float">
                搭
              </div>
              <div className="flex-1">
                <div className="bg-white dark:bg-[#374151] rounded-2xl rounded-tl-md p-5 shadow-lg">
                  <p className="text-lg text-[#1F2937] dark:text-white leading-relaxed">
                    {currentQuestion.question}
                  </p>
                  {currentQuestion.subtext && (
                    <p className="text-sm text-[#9CA3AF] mt-2">
                      {currentQuestion.subtext}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 ml-15">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectOption(index)}
                  disabled={answers[currentStep] !== null}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 ${
                    answers[currentStep] === index
                      ? 'border-[#FF6B35] bg-[#FF6B35]/10 text-[#FF6B35]'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252542] text-[#1F2937] dark:text-white hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/5'
                  } ${answers[currentStep] !== null ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                      answers[currentStep] === index
                        ? 'border-[#FF6B35] bg-[#FF6B35] text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {answers[currentStep] === index && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {option.text}
                  </span>
                </button>
              ))}
            </div>


          </div>
        </div>
      </div>
    </main>
  );
}
