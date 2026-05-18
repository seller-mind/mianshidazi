'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from './ui/Button';

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 检查是否已经做出过选择
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // 首次访问，延迟显示弹窗
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    setIsVisible(false);
    onAccept?.();
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    setIsVisible(false);
    onDecline?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#252542] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🍪</span>
              <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white">
                我们使用Cookie
              </h3>
            </div>
            <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-4">
              为了更好地了解您如何使用我们的服务，并提供个性化体验，
              我们需要在您的设备上存储一小段信息（Cookie）。
              点击"同意"即表示您同意我们使用Cookie来提升您的使用体验。
              您也可以选择"仅必要"，仅保留服务运行必需的功能。
            </p>
            <div className="flex flex-wrap gap-4 text-xs">
              <Link href="/privacy" className="text-[#FF6B35] hover:underline">
                了解更多关于我们如何使用Cookie
              </Link>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 min-w-[140px]">
            <Button
              onClick={handleAccept}
              variant="primary"
              className="w-full"
            >
              同意全部
            </Button>
            <Button
              onClick={handleDecline}
              variant="secondary"
              className="w-full"
            >
              仅必要的
            </Button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Cookie设置面板 - 用户可以之后修改Cookie偏好
 */
export function CookieSettings() {
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  const handleSave = () => {
    localStorage.setItem('cookie_consent', JSON.stringify(preferences));
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    setShowSettings(false);
  };

  return (
    <div className="inline-block">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="text-xs text-gray-500 hover:text-[#FF6B35] underline"
      >
        Cookie设置
      </button>
      
      {showSettings && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#252542] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
          <h4 className="font-medium text-[#1F2937] dark:text-white mb-3">
            Cookie偏好设置
          </h4>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.necessary}
                onChange={(e) => setPreferences({ ...preferences, necessary: e.target.checked })}
                disabled
                className="w-4 h-4 text-[#FF6B35] rounded"
              />
              <div>
                <span className="text-sm font-medium text-[#1F2937] dark:text-white">
                  必要Cookie
                </span>
                <p className="text-xs text-gray-500">
                  服务运行必需，无法关闭
                </p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                className="w-4 h-4 text-[#FF6B35] rounded"
              />
              <div>
                <span className="text-sm font-medium text-[#1F2937] dark:text-white">
                  分析Cookie
                </span>
                <p className="text-xs text-gray-500">
                  帮助我们了解服务使用情况
                </p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                className="w-4 h-4 text-[#FF6B35] rounded"
              />
              <div>
                <span className="text-sm font-medium text-[#1F2937] dark:text-white">
                  营销Cookie
                </span>
                <p className="text-xs text-gray-500">
                  用于个性化推荐和广告
                </p>
              </div>
            </label>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-2 bg-[#FF6B35] text-white text-sm rounded-lg hover:bg-[#E55A28]"
            >
              保存设置
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
