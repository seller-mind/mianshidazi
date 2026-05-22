import Link from 'next/link';
export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FF6B35] transition-colors mb-6"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>返回首页</Link>
        <div className="flex items-center gap-3 text-sm text-gray-400 mb-4"><span>2026年5月</span><span>·</span><span>阅读约2分钟</span></div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">面试大脑空白怎么办？3步恢复冷静</h1>
        <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>面试官刚问完问题，你的大脑突然一片空白——明明准备过，但那一刻什么都想不起来。这种"脑暴型紧张"是最常见的面试紧张类型，发生在大约40%的求职者身上。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">为什么会大脑空白？</h2>
          <p>这是人体的应激反应。当你感到高度紧张时，大脑的前额叶皮层（负责逻辑思考和语言组织）会被杏仁核（负责恐惧反应）"劫持"，导致你无法正常思考。这不是你能力不行，是大脑的防御机制。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">3步恢复冷静</h2>
          <p><strong>1. 短暂停顿 + 过渡句</strong><br/>不要急着开口。说一句"这个问题很好，让我想一想"，给自己5-10秒。面试官不会因此扣分，反而觉得你在认真思考。</p>
          <p><strong>2. 用STAR法则组织思路</strong><br/>脑子里有了框架就不容易空白。遇到行为类问题，按STAR法则想：情境→任务→行动→结果。即使紧张，有了框架也能慢慢说。</p>
          <p><strong>3. 先说熟悉的内容</strong><br/>如果还是想不起来，先从你最熟悉的部分开始说。比如先介绍背景，说着说着大脑就会自动启动，后面的内容自然就想起来了。</p>
          <p className="mt-4">长期来说，最有效的方法是语音模拟面试——逼自己当场组织语言，练到"嘴巴有记忆"。练得多了，大脑就不会轻易"死机"。</p>
        </div>
        <div className="mt-8 bg-[#FF6B35] rounded-xl p-6 text-center">
          <h3 className="text-white font-bold text-lg mb-2">测测你是不是"脑暴型"紧张？</h3>
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
