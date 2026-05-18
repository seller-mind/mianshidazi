import Link from 'next/link';

interface LegalLayoutProps {
  children: React.ReactNode;
  title: string;
  lastUpdated?: string;
}

export default function LegalLayout({ children, title, lastUpdated }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542]">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#1A1A2E]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-sm">
              阿
            </div>
            <span className="font-semibold text-[#1F2937] dark:text-white">面试搭子</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-[#6B7280] hover:text-[#FF6B35] transition-colors">
              返回首页
            </Link>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          {/* 标题区域 */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1F2937] dark:text-white mb-4">
              {title}
            </h1>
            {lastUpdated && (
              <p className="text-sm text-[#6B7280] dark:text-gray-400">
                最后更新：{lastUpdated}
              </p>
            )}
          </div>

          {/* 内容区域 */}
          <div className="bg-white dark:bg-[#252542] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 md:p-12">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-[#1A1A2E] text-gray-400 py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-sm">
                阿
              </div>
              <span className="font-semibold text-white">面试搭子</span>
            </div>
            
            <div className="flex gap-6 text-sm flex-wrap justify-center">
              <Link href="/privacy" className="hover:text-white transition-colors">隐私政策</Link>
              <Link href="/terms" className="hover:text-white transition-colors">用户协议</Link>
              <Link href="/refund" className="hover:text-white transition-colors">退款政策</Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2025 面试搭子 mianshidazi.com. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
