import Link from 'next/link';
export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FF6B35] transition-colors mb-6"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>返回首页</Link>
        <div className="flex items-center gap-3 text-sm text-gray-400 mb-4"><span>2026年5月</span><span>·</span><span>阅读约2分钟</span></div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">社恐怎么面试？内向者面试生存指南</h1>
        <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>社恐面试有多难？光是想想要和陌生人面对面说话，心跳就加速了。再加上面试官盯着你、随时可能问出让你措手不及的问题——简直是噩梦。但社恐不等于不能面试，关键是找到适合你的方式。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">1. 提前模拟练习，减少"未知恐惧"</h2>
          <p>社恐最大的敌人是"未知"——不知道面试官会问什么、不知道自己会怎么表现。解决办法是提前做大量模拟面试，让自己熟悉面试流程。推荐用AI语音模拟面试，不用担心被真人评判，可以先从低压力开始练习。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">2. 用结构化回答，减少临场思考</h2>
          <p>社恐的人临场组织语言更困难，所以提前准备好回答框架很重要。比如所有行为类问题都用STAR法则，所有观点类问题都用"我认为…因为…比如…"的结构。有了框架，紧张时也能按照结构慢慢说。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">3. 允许自己慢慢说</h2>
          <p>很多人觉得面试必须说得快、说得流畅，其实不然。慢慢说、有停顿，比说得快但磕磕巴巴好得多。面试官更看重内容质量，而不是说话速度。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">4. 把面试当成"平等的对话"</h2>
          <p>社恐的人往往把面试当成"被审判"，这种心态会让你更紧张。试着换一个角度：面试是双向选择，你也在考察这家公司是否适合你。你不是在"求"一份工作，而是在"谈"一个合作机会。</p>
          <p className="mt-4">社恐不是面试的死刑。找到适合自己的练习方式，你一样可以在面试中展示出真实的实力。</p>
        </div>
        <div className="mt-8 bg-[#FF6B35] rounded-xl p-6 text-center">
          <h3 className="text-white font-bold text-lg mb-2">测测你是不是"社交恐惧型"紧张？</h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <Link href="/diagnose" className="inline-block px-6 py-3 bg-white text-[#FF6B35] font-bold rounded-lg hover:bg-gray-100 transition-colors">免费测紧张类型</Link>
            <Link href="/practice" className="inline-block px-6 py-3 bg-white/20 text-white font-bold rounded-lg hover:bg-white/30 transition-colors">AI语音模拟面试</Link>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">面试搭子 mianshidazi.com | AI内容仅供参考</p>
      </div>
    </main>
  );
}
