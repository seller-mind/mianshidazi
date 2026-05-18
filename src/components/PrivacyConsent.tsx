'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/Button';

interface PrivacyConsentProps {
  onConsent: (consented: boolean) => void;
  mode?: 'modal' | 'inline';
}

/**
 * 隐私政策同意弹窗/组件
 * 根据PIPL要求，用户必须在使用服务前同意隐私政策
 */
export default function PrivacyConsent({ onConsent, mode = 'modal' }: PrivacyConsentProps) {
  const [showFullPolicy, setShowFullPolicy] = useState(false);

  if (mode === 'inline') {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 max-h-60 overflow-y-auto">
          <h4 className="font-medium text-[#1F2937] dark:text-white mb-2">隐私政策摘要</h4>
          <div className="text-sm text-[#6B7280] dark:text-gray-400 space-y-2">
            <p><strong>我们收集：</strong>微信信息、手机号、使用数据、设备信息</p>
            <p><strong>数据存储：</strong>海外服务器（Supabase新加坡数据中心）</p>
            <p><strong>第三方共享：</strong>阿里云百炼（AI服务）、虎皮椒（支付）、微软（语音）</p>
            <p><strong>您的权利：</strong>访问、更正、删除个人信息</p>
            <p className="text-amber-600 dark:text-amber-400">
              <strong>注意：</strong>数据跨境传输已获监管认可，您使用服务即表示同意
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="privacy-consent"
            className="mt-1 w-4 h-4 text-[#FF6B35] rounded"
          />
          <label htmlFor="privacy-consent" className="text-sm text-[#6B7280] dark:text-gray-400">
            我已阅读并同意{' '}
            <Link href="/privacy" target="_blank" className="text-[#FF6B35] hover:underline">
              《隐私政策》
            </Link>
            {' '}和{' '}
            <Link href="/terms" target="_blank" className="text-[#FF6B35] hover:underline">
              《用户协议》
            </Link>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-[#252542] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-[#1F2937] dark:text-white">
            使用前请阅读
          </h2>
          <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1">
            根据法规要求，我们需要您同意以下内容
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {/* AI声明 */}
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded text-xs font-medium">
                  AI生成
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-300">必读</span>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                本服务使用阿里云百炼AI技术生成面试建议。<strong>AI内容仅供参考</strong>，
                不构成专业职业指导或心理治疗。如有严重焦虑或心理困扰，请寻求专业人士帮助。
              </p>
            </div>

            {/* 隐私摘要 */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium text-[#1F2937] dark:text-white mb-2 flex items-center gap-2">
                <span>🔒</span> 隐私政策摘要
              </h4>
              <ul className="text-sm text-[#6B7280] dark:text-gray-400 space-y-1">
                <li>• 数据存储于海外服务器（新加坡）</li>
                <li>• 阿里云、虎皮椒、微软等第三方服务商</li>
                <li>• 您有权访问、更正和删除个人信息</li>
                <li>• Cookie用于改善服务体验</li>
              </ul>
            </div>

            {/* 完整协议链接 */}
            <div className="text-center">
              <button
                onClick={() => setShowFullPolicy(!showFullPolicy)}
                className="text-sm text-[#FF6B35] hover:underline"
              >
                {showFullPolicy ? '收起' : '查看完整'}《隐私政策》和《用户协议》
              </button>
              
              {showFullPolicy && (
                <div className="mt-4 text-left">
                  <p className="text-sm text-[#6B7280] dark:text-gray-400 leading-relaxed">
                    完整协议包含：个人信息收集范围、数据使用目的、第三方共享详情、
                    用户权利说明、退款政策、知识产权归属、争议解决方式等详细内容。
                    请前往{' '}
                    <Link href="/privacy" className="text-[#FF6B35]" target="_blank">
                      隐私政策
                    </Link>
                    {' '}和{' '}
                    <Link href="/terms" className="text-[#FF6B35]" target="_blank">
                      用户协议
                    </Link>
                    {' '}页面查看完整内容。
                  </p>
                </div>
              )}
            </div>

            {/* 同意勾选 */}
            <div className="flex items-start gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <input
                type="checkbox"
                id="agree-terms"
                className="mt-1 w-4 h-4 text-[#FF6B35] rounded"
              />
              <label htmlFor="agree-terms" className="text-sm text-[#6B7280] dark:text-gray-400">
                我已阅读并理解上述声明，同意使用面试搭子服务，包括：
                <ul className="mt-1 space-y-0.5 pl-4">
                  <li>• AI生成内容仅供参考的免责声明</li>
                  <li>• 隐私政策中描述的数据处理方式</li>
                  <li>• 数据跨境传输至海外服务器</li>
                </ul>
              </label>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex gap-3">
            <Button
              onClick={() => onConsent(false)}
              variant="secondary"
              className="flex-1"
            >
              不同意
            </Button>
            <Button
              onClick={() => onConsent(true)}
              variant="primary"
              className="flex-1"
            >
              同意并继续
            </Button>
          </div>
          <p className="text-xs text-center text-gray-500 mt-3">
            不同意将无法使用服务，您可以在设置中随时撤回同意
          </p>
        </div>
      </div>
    </div>
  );
}
