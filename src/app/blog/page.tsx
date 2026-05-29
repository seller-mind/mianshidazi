import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '面试技巧博客 | 面试搭子',
  description: '面试紧张怎么办？面试技巧、面试心态调整、模拟面试练习。免费面试紧张类型测试，帮你找到紧张的根源。',
  keywords: '面试技巧, 面试紧张, 面试焦虑, 模拟面试, 面试准备',
};

const posts = [
  {
    slug: 'mianshi-jinzhang-zhende-bushi-ni-buhui',
    title: '面试紧张，真的不是你不会',
    desc: '紧张会让你丢掉30%-50%的真实水平。你不是能力不行，是被紧张偷走了发挥。',
    date: '2026-05-29',
  },
  {
    slug: 'mianshi-zhuizhen-bushi-shenpan',
    title: '面试官追问不是在审判你',
    desc: '追问恰恰说明他对你说的感兴趣。学会应对追问，面试表现提升一个档次。',
    date: '2026-05-28',
  },
  {
    slug: 'mianshi-jinzhang-leixing',
    title: '5种面试紧张类型，你是哪一种？',
    desc: '脑暴型、身体型、社交恐惧型、完美主义型、PTSD型——不同类型的紧张，解法完全不同。',
    date: '2026-05-27',
  },
  {
    slug: 'shekong-mianshi',
    title: '社恐/内向的人怎么面试？5个实用策略',
    desc: '内向的人面试有个天然优势：倾听能力。用对方法，内向也能拿offer。',
    date: '2026-05-26',
  },
  {
    slug: 'mianshi-qian-yi-wan-shuibuzhao',
    title: '面试前一晚睡不着？3个方法亲测有效',
    desc: '身体欺骗法、写下来别背、紧张类型测试——3个方法帮你面试前夜安然入睡。',
    date: '2026-05-25',
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">面试技巧博客</h1>
        <p className="text-gray-600 mb-8">面试紧张怎么办？这里有你想知道的一切。</p>
        
        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="text-sm text-orange-500 mb-1">{post.date}</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h2>
              <p className="text-gray-600">{post.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 p-6 bg-orange-50 rounded-xl text-center">
          <h3 className="text-lg font-semibold mb-2">免费测你的面试紧张类型</h3>
          <p className="text-gray-600 mb-4">5道题，2分钟，精准定位你的紧张根源</p>
          <Link
            href="/diagnose"
            className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            免费做紧张测试 →
          </Link>
        </div>
      </div>
    </main>
  );
}
