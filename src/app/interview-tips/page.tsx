import Link from 'next/link';

const tips = [
  { title: '了解公司和你应聘的岗位', content: '面试前去官网、公众号、新闻报道了解一下公司做什么、文化是什么、岗位需要什么能力。面试中能说出对公司的了解，面试官会觉得你用心了。' },
  { title: '用STAR法则讲经历', content: '描述经历时用Situation（情境）→ Task（任务）→ Action（行动）→ Result（结果）的结构，比泛泛而谈有说服力得多。比如"在实习期间（S），负责提升用户留存（T），我优化了推送策略（A），留存率提升了15%（R）"。' },
  { title: '准备3个自己的核心故事', content: '把你的经历梳理成3个有代表性的故事：一个展现解决问题能力，一个展现团队协作，一个展现学习能力。大部分行为面试题都能从这3个故事中找到素材。' },
  { title: '别背稿，要开口说', content: '写好稿子背是最常见的误区——一紧张全忘。面试是"说"出来的，不是"写"出来的。用语音模拟面试逼自己当场组织语言，练到嘴巴比脑子快。' },
  { title: '着装得体但不刻意', content: '穿得比日常正式一点就好，不必西装革履去面互联网公司。干净整洁、穿着舒服最重要——衣服不舒服也会让你更紧张。' },
  { title: '提前到但别太早', content: '提前10-15分钟到就好。太早在候场区干等反而增加焦虑。到了之后深呼吸，在心里默念一遍自我介绍的开头。' },
  { title: '面试中允许自己停顿', content: '遇到不会的问题不要急着答。说一句"这个问题很好，让我想一想"，然后给自己5-10秒组织语言，比脱口而出好得多。' },
  { title: '准备2-3个反问问题', content: '面试官问"你有什么想了解的吗？"时，问"这个岗位的日常一天大概是什么样的？"或"团队目前最大的挑战是什么？"——比"没有问题"好一百倍。' },
  { title: '紧张是正常的，别和它对抗', content: '面试紧张≠你不行。紧张说明你在乎这个机会。关键是了解自己的紧张类型——是脑子空白型、身体反应型还是社交恐惧型？不同类型有不同的应对方式。' },
  { title: '每次面试后复盘', content: '面完不管结果如何，花5分钟记下：哪个问题答得好、哪个卡壳了、下次怎么答得更好。3次复盘后你会发现进步巨大。' },
];

export default function InterviewTipsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FF6B35] transition-colors mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">面试技巧</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">10个实用面试建议，帮你从容应对每一场面试</p>

        <div className="space-y-6">
          {tips.map((tip, i) => (
            <div key={i} className="bg-white dark:bg-[#252542] rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FF6B35] text-white flex items-center justify-center text-sm font-bold">{i + 1}</span>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{tip.title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{tip.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-[#FF6B35] rounded-xl p-6 text-center">
          <h3 className="text-white font-bold text-lg mb-2">先测测你是哪种面试紧张？</h3>
          <p className="text-white/80 text-sm mb-4">了解自己的紧张类型，才能对症练习</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/diagnose" className="inline-block px-6 py-3 bg-white text-[#FF6B35] font-bold rounded-lg hover:bg-gray-100 transition-colors">免费测紧张类型</Link>
            <Link href="/practice" className="inline-block px-6 py-3 bg-white/20 text-white font-bold rounded-lg hover:bg-white/30 transition-colors">AI语音模拟面试</Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">面试搭子 mianshidazi.com | AI内容仅供参考</p>
      </div>
    </main>
  );
}
