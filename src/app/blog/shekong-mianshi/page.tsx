import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社恐/内向的人怎么面试？5个实用策略 | 面试搭子',
  description: '内向的人面试有个天然优势：倾听能力。学会5个策略，内向也能拿offer。不要背答案、慢就是快、写备忘卡、练习到肌肉记忆。',
  keywords: '社恐面试, 内向面试, 面试紧张, 社交恐惧面试, 面试技巧',
};

export default function Post4() {
  return (
    <main className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-sm text-orange-500 mb-4">2026年5月26日</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">社恐/内向的人怎么面试？5个实用策略</h1>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <p>内向的人面试有个天然优势：<strong>倾听能力。</strong></p>
          <p>大部分外向的人说得多但听得少，面试官其实更喜欢你认真听、想清楚再说。关键是用对方法。</p>
          
          <h2>策略1：不要背答案</h2>
          <p>内向的人背答案比外向的更容易忘。记住3个核心案例，用"当时的情况是→我做了什么→结果怎样"来讲，比背整段话自然得多。</p>
          
          <h2>策略2：慢就是快</h2>
          <p>紧张时人会加速说话。刻意放慢语速，说一句停1秒，比说一堆废话有用。面试官不着急，你也不用急。</p>
          
          <h2>策略3：写备忘卡</h2>
          <p>面试前把3个关键词写在纸上或手机备忘录。线上面试的时候，贴在屏幕旁边。紧张时看一眼就够了。</p>
          
          <h2>策略4：练到肌肉记忆</h2>
          <p>内向的人需要的不是"更外向"，而是"更熟悉"。同样的问题回答10次，到第11次你就不用想了。AI模拟面试可以做到这点。</p>
          
          <h2>策略5：接受紧张</h2>
          <p>内向的人面试紧张是正常的。面试官不期待你多能说，他只想知道你能不能做事。专注展示你的能力和成果就好。</p>
          
          <h2>内向者最容易犯的错</h2>
          <p><strong>太谦虚。</strong>内向的人做了10分只说5分，外向的人做了5分说10分。面试不是谦虚的时候，把你的成果用数字说出来就行。</p>
          <p>比如：不要说"我做过一些数据分析"，要说"我用Excel分析了2000条数据，帮公司节省了30%成本"。</p>
          
          <h2>开始练习</h2>
          <p>如果你觉得自己面试紧张影响了发挥，可以先做个免费紧张类型测试，了解自己的问题才能针对性解决。</p>
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
