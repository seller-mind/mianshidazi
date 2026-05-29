import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '面试官追问不是在审判你 | 面试搭子',
  description: '面试官追问"然后呢""能具体说说吗"不是在质疑你，恰恰说明他对你说的感兴趣。学会应对追问，面试表现提升一个档次。',
  keywords: '面试追问, 面试官追问, 面试被追问, 面试技巧, 面试应对',
};

export default function Post2() {
  return (
    <main className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-sm text-orange-500 mb-4">2026年5月28日</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">面试官追问不是在审判你</h1>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <p>"然后呢？"</p>
          <p>"能具体说说吗？"</p>
          <p>"还有吗？"</p>
          <p>这三个问题，是不是面试时最怕听到的？</p>
          <p>大部分人被追问就慌了，觉得面试官在质疑自己。但真相是：<strong>追问恰恰说明他对你说的感兴趣。</strong></p>
          
          <h2>面试官追问的3个真实原因</h2>
          <h3>1. 验证真实性</h3>
          <p>他想知道你是不是真的做过这件事。太流利、太完美的回答反而会被怀疑是背的。追问细节，就是在确认你真的做过。</p>
          
          <h3>2. 挖掘深度</h3>
          <p>你的回答引出了他的好奇点。比如你说"我用Excel分析过数据"，他会追问"多少条数据？什么方法？"——这是好事，说明他对你的经历感兴趣。</p>
          
          <h3>3. 测试应变</h3>
          <p>他想看你在压力下能不能把故事讲清楚。这不是在难为你，而是在评估你的沟通能力。</p>
          
          <h2>被追问怎么应对？</h2>
          <ol>
            <li><strong>停2秒再回答</strong>：不要抢答。停一下整理思路，面试官不会觉得你笨，反而觉得你在认真思考</li>
            <li><strong>用具体数字</strong>：追问往往是因为太抽象。"很多客户" → "当时管理了30+客户"</li>
            <li><strong>如果真忘了细节</strong>：诚实说"具体数字我记不太清了，但当时的情况是……"——比编一个好</li>
            <li><strong>如果不知道</strong>：说"这个我确实没有深入了解过，但我的理解是……"——展现思考过程比给出错误答案强</li>
          </ol>
          
          <h2>怎么练习应对追问？</h2>
          <p>最好的方法是模拟面试。AI模拟面试官会根据你的回答自动追问，和真实面试的追问逻辑很像。练几次之后，被追问就不会慌了。</p>
          <p>面试搭子提供5种不同人格的AI面试官，包括"压力挑战型"，专门帮你练习抗压能力。每天9.9元就能无限次练习。</p>
        </div>

        <div className="mt-12 p-6 bg-orange-50 rounded-xl text-center">
          <h3 className="text-lg font-semibold mb-2">免费测你的面试紧张类型</h3>
          <p className="text-gray-600 mb-4">8道题，3分钟，精准定位你的紧张根源</p>
          <Link
            href="/diagnose"
            className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            免费做紧张测试 →
          </Link>
        </div>
      </article>
    </main>
  );
}
