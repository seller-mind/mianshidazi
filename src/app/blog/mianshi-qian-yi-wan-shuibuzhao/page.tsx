import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '面试前一晚睡不着？3个方法亲测有效 | 面试搭子',
  description: '面试前一晚翻来覆去睡不着？身体欺骗法、写下来别背、紧张类型测试——3个方法帮你面试前夜安然入睡，第二天精神百倍。',
  keywords: '面试前一晚睡不着, 面试紧张睡不着, 面试前焦虑, 面试准备, 面试失眠',
};

export default function Post5() {
  return (
    <main className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-sm text-orange-500 mb-4">2026年5月25日</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">面试前一晚睡不着？3个方法亲测有效</h1>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <p>面试前一晚翻来覆去的，举个手。</p>
          <p>脑子里全是明天要说的每一句话，反复过自我介绍，越想越清醒，越清醒越焦虑，越焦虑越想……死循环。</p>
          
          <h2>方法1：身体欺骗法</h2>
          <p>面试前一晚的失眠，本质上是身体里肾上腺素太多，脑子太兴奋。</p>
          <p><strong>解法</strong>：睡前1小时做20个深蹲或30个俯卧撑。把身体里多余的肾上腺素消耗掉，累了自然就困了。</p>
          <p>注意：不要做剧烈运动（跑步、HIIT），那会让你更兴奋。轻度力量训练刚好。</p>
          
          <h2>方法2：写下来，别背</h2>
          <p>失眠的最大原因是"脑子在转"。你在反复想明天要说什么，但想又想不完整，越想越焦虑。</p>
          <p><strong>解法</strong>：拿一张纸，把3个核心案例的关键词写下来。</p>
          <p>写下来和"在脑子里转"是两个完全不同的状态。写下来 = 大脑认为"已经处理完了"，就不再反复想了。</p>
          <p>明天面试的时候，带着这张纸就行（线上面试可以贴在屏幕旁边）。</p>
          
          <h2>方法3：紧张类型测试</h2>
          <p>很多人的面试焦虑，是因为"不知道自己到底哪里有问题"，在瞎焦虑。</p>
          <p><strong>解法</strong>：做一下面试紧张类型测试。8道题3分钟，知道自己属于哪种紧张之后，焦虑反而会减轻。</p>
          <p>就像身体不舒服去医院，做完检查知道是什么病之后，心里反而踏实了——因为知道怎么治了。</p>
          
          <h2>还有一个狠招</h2>
          <p>如果以上都不管用，试试这个：<strong>降低期待。</strong></p>
          <p>告诉自己：明天这场面试，我就是来练手的。能过就过，过不了就当攒经验。</p>
          <p>得失心一放下来，你会发现整个人都放松了。放松了反而发挥更好，这就是面试的悖论。</p>
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
