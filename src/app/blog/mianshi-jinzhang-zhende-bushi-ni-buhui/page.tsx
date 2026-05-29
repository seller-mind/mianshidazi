import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '面试紧张，真的不是你不会 | 面试搭子',
  description: '面试紧张会让你丢掉30%-50%的真实水平。你表现出来的不等于你真正会的。了解紧张的本质，学会与紧张共处。',
  keywords: '面试紧张, 面试大脑空白, 面试紧张怎么办, 面试焦虑, 面试发挥失常',
};

export default function Post1() {
  return (
    <main className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-sm text-orange-500 mb-4">2026年5月29日</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">面试紧张，真的不是你不会</h1>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <p>你有没有这种感觉——明明准备得好好的，一坐到面试官对面，脑子像被格式化了一样，全空白了。</p>
          <p>回去一想：<strong>我明明会啊！！</strong></p>
          
          <h2>紧张会偷走你30%-50%的实力</h2>
          <p>这不是夸张。面试紧张时，身体会释放大量肾上腺素和皮质醇，这些激素会让血液从前额叶（负责逻辑思考的脑区）流向杏仁核（负责情绪反应的脑区）。</p>
          <p>简单说：<strong>你不是忘了，是负责"想"的那个脑区暂时罢工了。</strong></p>
          <p>这意味着什么？如果你的真实能力是80分，紧张后可能只发挥40分。这40分可能连面试及格线都过不了。</p>
          
          <h2>大部分面试被刷的人，不是能力不行</h2>
          <p>面试官看的是你"表现出来的水平"，不是你"真实的水平"。如果紧张让你的真实水平打了5折，那被刷掉完全不奇怪。</p>
          <p>更扎心的是：很多人面试失败后开始自我怀疑，"是不是我真的不行？"——不是你不行，是你没学会跟紧张相处。</p>
          
          <h2>紧张其实有5种类型</h2>
          <p>大部分人觉得紧张就是紧张，但其实紧张分为5种完全不同的类型：</p>
          <ul>
            <li><strong>脑暴型</strong>：一紧张思绪满天飞，东一句西一句，逻辑全乱</li>
            <li><strong>身体型</strong>：心跳加速、手抖、声音发颤，但脑子里很清楚</li>
            <li><strong>社交恐惧型</strong>：不是不会说，是不敢说，怕被否定</li>
            <li><strong>完美主义型</strong>：总觉得自己说得不够好，反复修改，越改越乱</li>
            <li><strong>PTSD型</strong>：之前面试有过严重失败，形成了心理阴影</li>
          </ul>
          <p><strong>不同类型的紧张，解法完全不同。</strong>脑暴型需要练习结构化表达，身体型需要做呼吸训练，完美主义型需要学会"够好就行"。</p>
          
          <h2>面试中大脑空白怎么办？</h2>
          <ol>
            <li>说一句"这个问题很好，让我想想"——给自己争取3秒</li>
            <li>用STAR法则组织回答（情境-任务-行动-结果）</li>
            <li>语速放慢1/3，紧张时人会不自觉加速</li>
            <li>回到你准备过的核心案例上，从熟悉的内容切入</li>
          </ol>
          
          <h2>怎么知道自己是什么紧张类型？</h2>
          <p>面试搭子提供免费的面试紧张类型测试，8道题就能精准定位你的紧张类型，还会给出针对性的改善建议。</p>
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
