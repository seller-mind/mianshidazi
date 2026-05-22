import Link from 'next/link';
export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FF6B35] transition-colors mb-6"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>返回首页</Link>
        <div className="flex items-center gap-3 text-sm text-gray-400 mb-4"><span>2026年5月</span><span>·</span><span>阅读约2分钟</span></div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">面试前焦虑睡不着？3个方法帮你安心入睡</h1>
        <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>明天面试，今晚却怎么也睡不着——翻来覆去想着"万一答不上来怎么办"。越想越清醒，越清醒越焦虑。面试前失眠非常普遍，但你可以做一些事情来缓解。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">为什么面试前会焦虑睡不着？</h2>
          <p>面试前的焦虑本质上是对"不确定性"的恐惧——你不确定自己能不能表现好。大脑会反复模拟各种"最坏情况"，让你无法放松。而睡眠不足又会影响第二天的思维和表达，形成恶性循环。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">1. 白天充分练习，增强信心</h2>
          <p>焦虑的根源是"觉得自己没准备好"。所以最有效的办法就是白天做好充分练习。用语音模拟面试多练几场，练到自己觉得"就算紧张我也能说出来"的程度。信心足了，睡前自然就不那么焦虑了。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">2. 睡前做放松活动</h2>
          <p>睡前1小时停止"准备面试"——不要再刷面试技巧、不要反复背自我介绍。做一些放松的事情：听轻音乐、泡个脚、做几组深呼吸。如果脑子里还是停不下来，试着写下"明天我需要记住的3件事"，写完告诉自己：已经记下来了，可以睡了。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">3. 接受"不完美也没关系"</h2>
          <p>很多时候睡不着是因为你在追求"完美表现"——每个问题都想答得天衣无缝。但面试不是考试，没有人能完美地回答所有问题。面试官看重的是你的思考方式和态度，而不是标准答案。告诉自己"明天尽力就好，不用完美"，你会发现轻松很多。</p>
          <p className="mt-4">如果面试前的焦虑持续影响你的睡眠和生活，建议寻求专业心理咨询师的帮助。面试很重要，但你的身心健康更重要。</p>
        </div>
        <div className="mt-8 bg-[#FF6B35] rounded-xl p-6 text-center">
          <h3 className="text-white font-bold text-lg mb-2">了解你的紧张类型，更有针对性地练习</h3>
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
