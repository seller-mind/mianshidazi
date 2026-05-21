import Link from 'next/link';

interface FooterProps {
  showNavigation?: boolean;
}

export default function Footer({ showNavigation = true }: FooterProps) {
  return (
    <footer className="bg-[#1A1A2E] text-gray-400 py-6 md:py-8 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-bold text-[10px] md:text-sm">
              搭
            </div>
            <span className="font-semibold text-white text-sm md:text-base">面试搭子</span>
          </div>
          
          {showNavigation && (
            <div className="flex gap-4 md:gap-6 text-xs md:text-sm flex-wrap justify-center">
              <Link href="/diagnose" className="hover:text-white transition-colors">紧张类型测试</Link>
              <Link href="/practice" className="hover:text-white transition-colors">模拟面试</Link>
              <Link href="/companion" className="hover:text-white transition-colors">阿搭聊天</Link>
              <Link href="/report" className="hover:text-white transition-colors">面试报告</Link>
            </div>
          )}
          
          <div className="flex gap-4 md:gap-6 text-xs md:text-sm flex-wrap justify-center">
            <Link href="/privacy" className="hover:text-white transition-colors">隐私政策</Link>
            <Link href="/terms" className="hover:text-white transition-colors">用户协议</Link>
            <Link href="/refund" className="hover:text-white transition-colors">退款政策</Link>
          </div>
        </div>
        
        <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-800 text-center text-xs md:text-sm">
          <p>&copy; {new Date().getFullYear()} 面试搭子 mianshidazi.com. All rights reserved.</p>
          <p className="mt-1.5 md:mt-2 text-[10px] md:text-xs text-gray-500">
            AI面试建议仅供参考，不构成专业职业指导或心理治疗建议
          </p>
          <div className="mt-3 md:mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-[10px] md:text-xs text-gray-500">
            <span>反馈及联系：</span>
            <a href="mailto:haimozhouqiu@outlook.com" className="hover:text-white transition-colors">📧 haimozhouqiu@outlook.com</a>
            <span>💬 微信：txd027</span>
          </div>
          <p className="mt-3 text-[10px] text-gray-600">
            网站备案号：待补充（运营主体信息将在备案完成后更新）
          </p>
        </div>
      </div>
    </footer>
  );
}
