'use client';

export function CounterintuitiveSection() {
  // V9 反直觉洞察
  const insights = [
    {
      icon: '🤯',
      title: '紧张不是你的敌人',
      subtitle: '是信号',
      content: '哈佛研究发现，紧张和兴奋是同一种身体反应。区别只在于你怎么解读它。把"我好紧张"换成"我好兴奋"，表现会显著提升。',
      source: '哈佛商学院研究',
    },
    {
      icon: '🎯',
      title: '追问不是在审判你',
      subtitle: '是在确认',
      content: '面试官追问细节，不是要难为你，是在确认你真的做过这事。太流利的回答反而会被怀疑是背过的。',
      source: '脉脉HR分享',
    },
    {
      icon: '⏰',
      title: '"等通知"有四种可能',
      subtitle: '凉只是其中一种',
      content: '前程无忧调查：48%的人说收到等通知基本就没戏了。但也可能是：你是备胎、流程慢、要安排二面。关键看面试过程本身。',
      source: '前程无忧HR论坛',
    },
    {
      icon: '😤',
      title: '群面别抢当Leader',
      subtitle: '团队贡献度更重要',
      content: '群面淘汰率70%，但"团队贡献度"权重30%，"领导行为"权重只有15%。安静记录者可能比乱带节奏的Leader更受欢迎。',
      source: '前程无忧调研',
    },
  ];

  return (
    <section className="py-20 px-6 bg-[#1A1A2E] text-white">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <span className="text-[#FF6B35] text-sm font-medium mb-4 block">🔥 反直觉洞察</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            这些真相，面试官不会告诉你
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            但阿搭会
          </p>
        </div>

        {/* 洞察卡片 */}
        <div className="grid md:grid-cols-2 gap-6">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="bg-[#252542] rounded-2xl p-6 border border-gray-800 hover:border-[#FF6B35]/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{insight.icon}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">
                    {insight.title}
                  </h3>
                  <p className="text-[#FF6B35] text-sm mb-3">{insight.subtitle}</p>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                    {insight.content}
                  </p>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-gray-500 text-xs">{insight.source}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 阿搭结语 */}
        <div className="mt-12 flex gap-4 max-w-lg mx-auto">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
            阿
          </div>
          <div className="bg-[#2A2A45] rounded-2xl rounded-tl-md p-4">
            <p className="text-sm text-gray-300 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
              "阿搭说的每句话，都有真实的来源。
              不是编的，是真的。"
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
