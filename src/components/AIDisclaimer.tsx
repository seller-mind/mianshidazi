'use client';

interface AIDisclaimerProps {
  compact?: boolean;
  showInChat?: boolean;
}

/**
 * AI内容免责声明组件
 * 根据《生成式人工智能服务管理暂行办法》和《人工智能生成合成内容标识办法》
 * 需要在AI生成内容处添加明显标识
 */
export default function AIDisclaimer({ compact = false, showInChat = false }: AIDisclaimerProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 rounded-full">
          <span className="text-amber-600 dark:text-amber-400 font-medium">AI</span>
        </div>
        <span>内容由AI生成，仅供参考</span>
      </div>
    );
  }

  if (showInChat) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 py-2 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 mb-1">
          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded text-[10px] font-medium">
            AI生成
          </span>
          <span className="text-[10px]">根据《人工智能生成合成内容标识办法》标注</span>
        </div>
        <p className="leading-relaxed">
          本对话内容由人工智能（阿里云百炼qwen-plus）自动生成，仅供参考。
          不构成专业的职业指导、心理治疗或法律建议。如有疑问，请咨询专业人士。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
          <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">!</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded text-xs font-medium">
              AI生成内容
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-300">
              根据《人工智能生成合成内容标识办法》标注
            </span>
          </div>
          
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
            本页面/对话中的内容由人工智能（阿里云百炼qwen-plus）自动生成。
          </p>
          
          <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">
            重要声明：
          </h4>
          <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
            <li>• 本内容仅供参考，不构成专业的职业指导、心理治疗或法律建议</li>
            <li>• AI可能生成不准确、过时或不适用您具体情况的信息，请自行判断</li>
            <li>• 对于严重的面试焦虑或心理困扰，建议寻求专业人士帮助</li>
            <li>• 请勿将AI生成内容直接作为正式场合的唯一准备依据</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * AI标识徽章 - 用于消息气泡中
 */
export function AIBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded text-[10px] font-medium">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
      AI
    </span>
  );
}
