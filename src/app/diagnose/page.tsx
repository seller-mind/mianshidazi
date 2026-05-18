'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DIAGNOSTIC_QUESTIONS, TENSION_TYPES, calculateDiagnosticResult } from '@/lib/ai/config';
import { Button, ProgressIndicator, Card } from '@/components/ui';
import type { DiagnosticAnswer, TensionLevel } from '@/types';

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
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentQuestion = DIAGNOSTIC_QUESTIONS[currentStep];

  const handleSelectOption = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentStep] = optionIndex;
    setAnswers(newAnswers);

    // 自动进入下一步或完成
    setTimeout(() => {
      if (currentStep < DIAGNOSTIC_QUESTIONS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // 计算结果
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

  // 重新开始
  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers(new Array(DIAGNOSTIC_QUESTIONS.length).fill(null));
    setIsComplete(false);
    setResult(null);
  };

  if (isComplete && result) {
    const typeInfo = TENSION_TYPES[result.primaryType];
    const performanceScore = Math.max(40, 100 - result.tensionIndex);
    const scoreLost = result.tensionIndex * 0.6;

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
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-gray-200 dark:text-gray-700"
                      strokeDasharray={`${270 * 0.75} ${300}`}
                      strokeLinecap="round"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="url(#resultGradient)"
                      strokeWidth="8"
                      strokeDasharray={`${(result.tensionIndex / 100) * 270 * 0.75} ${300}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
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
                    <span className="font-medium text-[#1F2937] dark:text-white">{100 - Math.round(scoreLost)}分</span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${100 - scoreLost}%` }} />
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

          {/* 建议 */}
          <Card variant="highlight" className="mb-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
                阿
              </div>
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-white mb-2">阿搭的建议</h3>
                <ul className="space-y-2">
                  {typeInfo.advice.map((advice, i) => (
                    <li key={i} className="text-sm text-[#6B7280] dark:text-gray-400 leading-relaxed">
                      {advice}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* CTA按钮 */}
          <div className="flex flex-col gap-4">
            <Button size="lg" className="w-full" onClick={handleGoToPractice}>
              开始你的第一次AI面试练习
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
          <a href="/" className="flex items-center gap-2 text-[#6B7280] hover:text-[#FF6B35] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </a>
          <ProgressIndicator current={currentStep} total={DIAGNOSTIC_QUESTIONS.length} />
        </div>

        {/* 对话式问题 */}
        <div className="min-h-[70vh] flex flex-col justify-center">
          <div className="space-y-8">
            {/* 阿搭头像和消息 */}
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0 animate-float">
                阿
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

            {/* 选项 */}
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

            {/* 跳过按钮 */}
            <div className="text-center">
              <button
                onClick={() => setCurrentStep(prev => Math.min(prev + 1, DIAGNOSTIC_QUESTIONS.length - 1))}
                className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              >
                跳过这个问题
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
