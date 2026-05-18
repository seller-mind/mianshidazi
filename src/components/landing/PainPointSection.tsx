'use client';

export function PainPointSection() {
  const painPoints = [
    {
      title: '前一晚睡不着',
      description: '翻来覆去到凌晨三点，脑子里全是明天要说的每一句话',
      emoji: '😔',
      color: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
    },
    {
      title: '被追问大脑空白',
      description: '"然后呢？""能具体说说吗？"——完美的回答就这样被打断',
      emoji: '🤯',
      color: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
    },
    {
      title: '等通知焦虑',
      description: '每天刷八百遍邮箱/招聘APP，一有消息就心跳加速',
      emoji: '😰',
      color: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
    },
    {
      title: '面试失败崩溃',
      description: '"为什么又是我？""是不是我真的不行？"——自我怀疑的漩涡',
      emoji: '💔',
      color: 'from-pink-50 to-red-50 dark:from-pink-900/20 dark:to-red-900/20',
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
                  <p className="text-[#6B7280] dark:text-gray-400 text-sm leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 对话气泡风格总结 */}
        <div className="mt-12 bg-[#F9FAFB] dark:bg-[#252542] rounded-2xl p-6 max-w-lg mx-auto">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
              阿
            </div>
            <div className="chat-bubble-ada text-white px-4 py-3 rounded-2xl rounded-tl-md">
              <p className="text-sm leading-relaxed">
                "紧张不是你的错，它只是大脑在保护你。问题是，你一直没学会怎么跟它相处。"
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
