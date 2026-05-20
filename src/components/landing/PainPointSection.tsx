'use client';

import Link from 'next/link';

export function PainPointSection() {
  // V9 痛点场景
  const painPoints = [
    {
      title: '面试前一晚睡不着',
      description: '翻来覆去到凌晨三点，脑子里全是明天要说的每一句话',
      emoji: '😔',
      color: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
      quote: '"紧张不是你的错，它只是大脑在保护你。问题是，你一直没学会怎么跟它相处。"',
    },
    {
      title: '被追问大脑空白',
      description: '"然后呢？""能具体说说吗？"——完美的回答就这样被打断',
      emoji: '🤯',
      color: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
      quote: '"追问不是在审判你，是在确认你真的做过。愣几秒是正常的，面试官不会因为你在思考而觉得你不行。"',
    },
    {
      title: '等通知等焦虑',
      description: '每天刷八百遍邮箱/招聘APP，一有消息就心跳加速',
      emoji: '😰',
      color: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
      quote: '"有机构做过调查，48%的人说收到等通知基本就没戏了。但关键看过程，不只是那句话。"',
    },
    {
      title: '面试失败崩溃',
      description: '"为什么又是我？""是不是我真的不行？"——自我怀疑的漩涡',
      emoji: '💔',
      color: 'from-pink-50 to-red-50 dark:from-pink-900/20 dark:to-red-900/20',
      quote: '"不是你不行，是那场面试不值得。等两小时面十分钟，这种大概率不是你的问题。"',
    },
  ];

  return (
    <section className="py-20 px-6 bg-white dark:bg-[#1A1A2E]">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] dark:text-white mb-4">
            面试紧张，是你最大的敌人
          </h2>
          <p className="text-lg text-[#6B7280] dark:text-gray-400">
            这些场景，你是不是也经历过？
          </p>
        </div>

        {/* 痛点卡片 */}
        <div className="grid md:grid-cols-2 gap-6">
          {painPoints.map((point, index) => (
            <div
              key={index}
              className={`bg-gradient-to-br ${point.color} rounded-2xl p-6 border border-gray-100 dark:border-gray-800 transform hover:scale-[1.02] transition-transform`}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{point.emoji}</span>
                <div>
                  <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-2">
                    {point.title}
                  </h3>
                  <p className="text-[#6B7280] dark:text-gray-400 text-sm leading-relaxed mb-4">
                    {point.description}
                  </p>
                  {/* 阿搭的真实来源话术 */}
                  <div className="bg-white/80 dark:bg-[#1A1A2E]/80 rounded-xl p-3">
                    <p className="text-xs text-[#FF6B35] italic" style={{ whiteSpace: 'pre-wrap' }}>
                      {point.quote}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* V9 新增：紧张类型诊断入口 */}
        <div className="mt-12 bg-gradient-to-r from-[#FF6B35]/10 to-[#E55A28]/10 dark:from-[#FF6B35]/5 dark:to-[#E55A28]/5 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-3">
            🔍 找到你紧张的根本原因
          </h3>
          <p className="text-[#6B7280] dark:text-gray-400 mb-6 max-w-lg mx-auto">
            5种紧张类型，5种不同的应对方法。先诊断，再练习，才能真正解决。
          </p>
          <Link href="/diagnose">
            <button className="px-6 py-3 bg-[#FF6B35] text-white font-medium rounded-xl hover:bg-[#E55A28] transition-colors">
              免费做紧张类型诊断 →
            </button>
          </Link>
        </div>

        {/* 阿搭对话气泡 */}
        <div className="mt-12 flex gap-4 max-w-lg mx-auto">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
            阿
          </div>
          <div className="bg-[#F9FAFB] dark:bg-[#252542] rounded-2xl rounded-tl-md p-4 shadow-lg">
            <p className="text-sm text-[#6B7280] dark:text-gray-400 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
              "紧张不是你的敌人，是你的信号。
              问题是，你一直没学会怎么跟它相处。"
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
