import Link from 'next/link';

const types = [
  {
    emoji: '🧠',
    name: '脑暴型紧张',
    alias: 'A型',
    description: '大脑一片空白，思绪像被按了暂停键。明明准备得很充分，面试时却怎么也想不起来要说什么。',
    features: ['面试时脑子突然一片空白', '明明准备过的问题突然想不起来', '思绪混乱，说话前言不搭后语', '越想越慌，越慌越想不起来'],
    impact: '你的实际能力远比面试表现好。紧张让大脑"死机"，你的知识储备完全没有发挥出来。',
    suggestions: ['允许自己停顿5-10秒，说"让我想一想"争取时间', '用STAR法则提前组织好3个核心故事，减少临场思考量', '多做语音模拟面试，练到"嘴巴有记忆"，紧张时嘴巴也能自动说'],
    color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  },
  {
    emoji: '💓',
    name: '身体型紧张',
    alias: 'B型',
    description: '身体先开始反应——手抖、腿抖、心跳加速、声音发抖。身体的不适反过来加剧心理紧张。',
    features: ['手抖到拿不稳笔', '心跳快到能听到自己的心跳声', '声音发抖，连自我介绍都困难', '出汗、脸红、坐立不安'],
    impact: '身体反应会让面试官误以为你能力不足，实际上你只是身体过度紧张。你的专业能力并没有问题。',
    suggestions: ['面试前做几组深呼吸，降低心率', '面试中手放在桌面上方，减少抖动被看到的可能', '通过大量模拟面试让身体"脱敏"——练多了身体就不那么紧张了'],
    color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  },
  {
    emoji: '👀',
    name: '社交恐惧型紧张',
    alias: 'C型',
    description: '核心恐惧是被评判。不敢看面试官的眼睛，群体面试时特别紧张，总觉得面试官在挑毛病。',
    features: ['不敢看面试官的眼睛，眼神到处飘', '害怕被问私人问题', '群体面试时特别紧张', '面试后反复回想"刚才是不是说错话了"'],
    impact: '你的专业能力没问题，但社交焦虑让你无法自然展示自己。面试官看到的是退缩和不自信。',
    suggestions: ['把面试当成"平等的对话"而非"被审判"', '面试前多和人模拟练习，熟悉被人提问的感觉', '语音模拟面试可以减少面对面压力，从低压力开始练习'],
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  },
  {
    emoji: '🎯',
    name: '完美主义型紧张',
    alias: 'D型',
    description: '总想说最完美的答案，结果越想越说不出来。面试后反复复盘，陷入自责。',
    features: ['总想说最完美的答案，结果一个字都说不出来', '回答问题时犹豫不决，觉得哪个版本都不够好', '面试后反复回想，觉得自己表现很差', '不敢表达真实想法，只说"安全"的话'],
    impact: '完美主义让你"想得太多、说得太少"。面试不是考试，没有标准答案，面试官更想看到真实的你。',
    suggestions: ['接受"不够完美的回答也比不回答好"', '面试中先说出第一个想法，再补充完善', '模拟面试练习"快速回答"，训练自己先开口再完善的习惯'],
    color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  },
  {
    emoji: '🔄',
    name: '阴影型紧张',
    alias: 'E型',
    description: '之前的面试失败经历形成心理阴影，每次面试都想起上次的不愉快，陷入恶性循环。',
    features: ['一想到面试就想起上次失败的画面', '把一次失败当成"我就是不行"的证据', '面试中一旦出现小失误就心态崩溃', '越面越没信心，形成恶性循环'],
    impact: '一次失败不代表你不行。阴影型紧张的核心问题是"把过去的失败投射到了未来"，让你还没开始就输了。',
    suggestions: ['每次面试前写下3个自己做得好的地方，重建信心', '把面试当作"练习"而非"考试"，降低心理压力', '用语音模拟面试反复练习成功体验，覆盖失败记忆'],
    color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  },
];

export default function TensionTypesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FF6B35] transition-colors mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">面试紧张的5种类型</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">了解自己的紧张类型，才能找到最适合的应对方法</p>

        <div className="space-y-6">
          {types.map((type, i) => (
            <div key={i} className={`rounded-xl p-5 border-2 ${type.color}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{type.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{type.name}</h2>
                  <span className="text-xs text-gray-500">（{type.alias}）</span>
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">{type.description}</p>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">典型表现</h3>
                <ul className="space-y-1">
                  {type.features.map((f, fi) => (
                    <li key={fi} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-[#FF6B35]">•</span>{f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">对你的影响</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{type.impact}</p>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">应对建议</h3>
                <ul className="space-y-1">
                  {type.suggestions.map((s, si) => (
                    <li key={si} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-green-500">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>

              <Link href="/diagnose" className="inline-block text-sm text-[#FF6B35] font-medium hover:underline">
                测测你是不是{type.name} →
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-[#FF6B35] rounded-xl p-6 text-center">
          <h3 className="text-white font-bold text-lg mb-2">免费测测你是哪种面试紧张？</h3>
          <p className="text-white/80 text-sm mb-4">2分钟出结果，知道自己怕什么才能对症练</p>
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
