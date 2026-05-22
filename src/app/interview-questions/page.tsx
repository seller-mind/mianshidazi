import Link from 'next/link';

const categories = [
  {
    name: '自我介绍类',
    icon: '👋',
    questions: [
      { q: '请做一个自我介绍', tip: '1-2分钟，突出与岗位相关的经历和能力，不要念简历。用"我是谁+我做过什么+我为什么适合这个岗位"的结构。' },
      { q: '你最大的优点是什么？', tip: '选一个与岗位相关的优点，用具体事例佐证。比如"我执行力强，上学期独立完成了一个XXX项目"。' },
      { q: '你最大的缺点是什么？', tip: '说一个真实的、但正在改进的缺点。比如"我有时候太追求细节，现在我学会了先完成再完美"。' },
      { q: '为什么想来我们公司？', tip: '展示你对公司的了解：产品、文化、发展方向。结合自己的职业规划说。' },
      { q: '你的职业规划是什么？', tip: '3年内聚焦专业能力提升，5年希望能带团队。要和岗位发展路径吻合。' },
    ],
  },
  {
    name: '行为面试类',
    icon: '💡',
    questions: [
      { q: '描述一次你解决困难问题的经历', tip: '用STAR法则：情境→任务→行动→结果。重点讲你的思考和行动过程。' },
      { q: '团队合作中你和别人产生过分歧吗？怎么处理的？', tip: '讲事实不站队：先听对方想法→分析各自优劣→找共同目标→达成共识。' },
      { q: '你做过最有成就感的事是什么？', tip: '选一个你主动推动、有明确成果的经历。数字化的结果更有说服力。' },
      { q: '描述一次失败的经历', tip: '选一个真实的失败，重点讲你从中学到了什么、后来怎么改进的。' },
      { q: '你如何应对压力和紧急情况？', tip: '举例说明你如何在时间紧、任务重的情况下分清优先级、高效推进。' },
      { q: '你和领导意见不一致时怎么办？', tip: '先理解领导意图→私下表达自己想法→如果领导坚持，先执行再反馈。' },
    ],
  },
  {
    name: '情景面试类',
    icon: '🎯',
    questions: [
      { q: '如果入职后发现工作内容和你预期不同，你会怎么办？', tip: '先积极适应→主动和领导沟通→找到自己能贡献价值的地方。' },
      { q: '如果同事一直不配合你的工作怎么办？', tip: '先了解原因→寻求共同利益点→必要时请领导协调。展现沟通能力。' },
      { q: '如果同时有两个紧急任务怎么处理？', tip: '评估优先级和影响→和两个任务方沟通时间→先做影响更大的。' },
      { q: '如果你发现项目有重大风险但领导不在怎么办？', tip: '先记录风险和可能的应对方案→通知相关同事→等领导回来第一时间汇报。' },
      { q: '如果你负责的项目上线后出了问题怎么办？', tip: '第一时间响应→定位原因→快速修复→复盘改进流程。担责不甩锅。' },
    ],
  },
  {
    name: '反问面试官',
    icon: '❓',
    questions: [
      { q: '这个岗位的日常一天大概是什么样的？', tip: '展示你对工作内容的兴趣，也能帮你判断是否适合自己。' },
      { q: '团队目前最大的挑战是什么？', tip: '了解团队现状，顺便展示你愿意面对挑战的态度。' },
      { q: '您觉得这个岗位最需要什么能力？', tip: '了解核心要求，面试中可以趁机再展示一下相关能力。' },
      { q: '公司对新人有什么培训或成长计划？', tip: '展示你的学习意愿和长期发展想法。' },
      { q: '下一步流程是什么？大概多久有反馈？', tip: '合理的收尾问题，也让你心里有数。' },
    ],
  },
];

export default function InterviewQuestionsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FF6B35] transition-colors mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">面试常见问题</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">30道高频面试题及回答技巧，看完不如开口练</p>

        <div className="space-y-8">
          {categories.map((cat, ci) => (
            <div key={ci}>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>{cat.icon}</span> {cat.name}
              </h2>
              <div className="space-y-3">
                {cat.questions.map((item, qi) => (
                  <div key={qi} className="bg-white dark:bg-[#252542] rounded-xl p-4 shadow-sm">
                    <p className="font-medium text-gray-900 dark:text-white mb-2">Q: {item.q}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">💡 {item.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-[#FF6B35] rounded-xl p-6 text-center">
          <h3 className="text-white font-bold text-lg mb-2">看题不如开口练</h3>
          <p className="text-white/80 text-sm mb-4">AI语音模拟面试，逼你当场说出答案</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/practice" className="inline-block px-6 py-3 bg-white text-[#FF6B35] font-bold rounded-lg hover:bg-gray-100 transition-colors">开始模拟面试</Link>
            <Link href="/diagnose" className="inline-block px-6 py-3 bg-white/20 text-white font-bold rounded-lg hover:bg-white/30 transition-colors">免费测紧张类型</Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">面试搭子 mianshidazi.com | AI内容仅供参考</p>
      </div>
    </main>
  );
}
