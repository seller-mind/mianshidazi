import Link from 'next/link';
export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FF6B35] transition-colors mb-6"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>返回首页</Link>
        <div className="flex items-center gap-3 text-sm text-gray-400 mb-4"><span>2026年5月</span><span>·</span><span>阅读约3分钟</span></div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">面试紧张怎么办？5个方法帮你克服面试紧张</h1>
        <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>面试紧张几乎是每个求职者都会遇到的问题。数据显示，近6成面试失败不是因为能力不足，而是因为紧张导致发挥失常。面试紧张不是你的错，但你可以学会应对它。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">1. 先了解自己的紧张类型</h2>
          <p>面试紧张其实分5种类型：脑暴型（脑子空白说不出话）、身体型（手抖心跳加速）、社交恐惧型（怕被评判不敢看面试官）、完美主义型（总想说完美答案反而卡壳）、阴影型（之前面试失败的心理阴影）。不同类型需要不同的应对方式，知道自己是哪种才能对症下药。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">2. 用语音模拟面试练习</h2>
          <p>面试紧张的本质是"对未知的恐惧"——你不知道面试官会问什么，不知道自己能不能答好。最好的办法就是反复练习，让大脑和嘴巴熟悉面试的感觉。但找朋友陪练太麻烦，对镜自言自语又不够真实。AI语音模拟面试可以像真人面试官一样提问，逼你当场组织语言开口说，练到不紧张为止。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">3. 接受紧张是正常的</h2>
          <p>不要试图"消除"紧张——越想消除越紧张。紧张说明你在乎这个机会，是正常的生理反应。告诉自己"紧张没关系，我练过了，我能说出来"。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">4. 面试前做10分钟预热</h2>
          <p>面试前10分钟，大声把自我介绍说一遍——不是默念，是说出声。让你的嘴巴和声带进入"工作状态"。然后做3次深呼吸。面试一开口就流畅，和愣了3秒才开口，给面试官的第一印象完全不同。</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">5. 每次面试后复盘</h2>
          <p>面完花5分钟记下：哪个问题答得好、哪个卡壳了、下次怎么答更好。3次复盘后你会明显感觉到进步。有AI面试报告的话更好，它能从语速、逻辑、表达等维度给你具体反馈。</p>
          <p className="mt-4">面试紧张不可怕，可怕的是不练。免费测测你是哪种紧张类型，然后用AI语音模拟面试开口练——练多了，就不怕了。</p>
        </div>
        <div className="mt-8 bg-[#FF6B35] rounded-xl p-6 text-center">
          <h3 className="text-white font-bold text-lg mb-2">免费测测你是哪种面试紧张？</h3>
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
