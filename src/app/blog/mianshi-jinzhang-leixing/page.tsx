import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '5种面试紧张类型，你是哪一种？ | 面试搭子',
  description: '面试紧张分为5种类型：脑暴型、身体型、社交恐惧型、完美主义型、PTSD型。不同类型的紧张，解法完全不同。先测类型再练习。',
  keywords: '面试紧张类型, 面试紧张怎么办, 面试焦虑类型, 面试紧张测试, 面试恐惧',
};

export default function Post3() {
  return (
    <main className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-sm text-orange-500 mb-4">2026年5月27日</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">5种面试紧张类型，你是哪一种？</h1>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <p>大部分人觉得紧张就是紧张，但其实紧张分为5种完全不同的类型。<strong>不同类型的紧张，解法完全不同。</strong></p>
          
          <h2>1. 脑暴型紧张</h2>
          <p><strong>表现</strong>：一紧张思绪满天飞，东一句西一句，逻辑全乱。明明想说的很多，说出来却乱七八糟。</p>
          <p><strong>解法</strong>：练习结构化表达。用STAR法则（情境-任务-行动-结果）组织每个回答，训练"先说结论，再展开细节"的习惯。</p>
          
          <h2>2. 身体型紧张</h2>
          <p><strong>表现</strong>：心跳加速、手抖、声音发颤、手心出汗，但脑子里其实很清楚该说什么。</p>
          <p><strong>解法</strong>：做呼吸训练。4-7-8呼吸法（吸气4秒，屏息7秒，呼气8秒）可以快速降低心率。面试前做3组，身体型紧张能缓解60%以上。</p>
          
          <h2>3. 社交恐惧型紧张</h2>
          <p><strong>表现</strong>：不是不会说，是不敢说。怕被否定、怕说错、怕面试官觉得不好。越想越不敢开口。</p>
          <p><strong>解法</strong>：脱敏训练。从低压力场景开始练习——先对着镜子说，再对着朋友说，最后面对AI面试官说。逐步提升难度。</p>
          
          <h2>4. 完美主义型紧张</h2>
          <p><strong>表现</strong>：总觉得自己说得不够好，反复修改答案，越改越乱。一个简单的问题能想5分钟。</p>
          <p><strong>解法</strong>：学会"够好就行"。面试不需要满分答案，80分的回答足够了。刻意练习"说一遍就过"，不要反复修改。</p>
          
          <h2>5. PTSD型紧张</h2>
          <p><strong>表现</strong>：之前面试有过严重失败，形成了心理阴影。一想到面试就焦虑，甚至想逃避。</p>
          <p><strong>解法</strong>：重塑面试体验。通过AI模拟面试在安全环境中反复练习，用新的正面体验覆盖旧的负面记忆。每次练完看报告，你会发现自己其实没那么差。</p>
          
          <h2>怎么知道自己属于哪种？</h2>
          <p>面试搭子提供免费的紧张类型测试，8道题3分钟，精准定位你的紧张类型，还会给出针对性的改善建议。</p>
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
