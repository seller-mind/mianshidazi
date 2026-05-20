'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

// V10 定价方案 - 紧张诊断和阿搭聊天免费，模拟面试收费
const PRICING_PLANS = [
  {
    id: 'single',
    name: '单次模拟面试',
    price: 9.9,
    priceLabel: '¥9.9',
    description: '先试一次',
    features: [
      '1次模拟面试',
      '面试练习报告',
    ],
    freeNote: '紧张类型诊断 · 阿搭聊天 · 永久免费',
    cta: '开始模拟面试',
    popular: false,
  },
  {
    id: 'monthly',
    name: '月卡会员',
    price: 49,
    priceLabel: '¥49/月',
    originalPrice: 99,
    description: '约等于5杯奶茶',
    features: [
      '无限次模拟面试',
      '面试练习报告',
      '5种面试官人格',
    ],
    freeNote: '紧张类型诊断 · 阿搭聊天 · 永久免费',
    cta: '开通月卡',
    popular: true,
  },
  {
    id: 'quarterly',
    name: '季卡会员',
    price: 119,
    priceLabel: '¥119/季',
    originalPrice: 279,
    description: '约等于2杯奶茶/月',
    features: [
      '月卡全部权益',
      '面试复盘指导',
      '专属紧张缓解训练',
    ],
    freeNote: '紧张类型诊断 · 阿搭聊天 · 永久免费',
    cta: '开通季卡',
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542]">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] dark:text-white mb-4">
            模拟面试，收费；其他的，免费
          </h2>
          <p className="text-lg text-[#6B7280] dark:text-gray-400">
            紧张类型诊断和阿搭聊天永久免费，只有模拟面试收费
          </p>
        </div>

        {/* 免费功能说明 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 mb-12 max-w-2xl mx-auto border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🆓</span>
            <div>
              <p className="font-medium text-green-700 dark:text-green-400 mb-2">永久免费</p>
              <p className="text-sm text-green-600 dark:text-green-300 leading-relaxed">
                紧张类型诊断 — 5种紧张类型，精准定位你的问题根源
              </p>
              <p className="text-sm text-green-600 dark:text-green-300 leading-relaxed mt-1">
                阿搭聊天 — 面试前紧张、面试后崩溃、等通知焦虑，随时找阿搭聊
              </p>
            </div>
          </div>
        </div>

        {/* 定价卡片 */}
        <div className="grid md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-[#252542] rounded-2xl p-6 shadow-sm border ${
                plan.popular
                  ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/20'
                  : 'border-gray-100 dark:border-gray-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FF6B35] text-white text-xs font-medium rounded-full">
                  最受欢迎
                </div>
              )}

              {/* 套餐名称 */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {plan.description}
                </p>
              </div>

              {/* 价格 */}
              <div className="text-center mb-6">
                <span className="text-3xl font-bold text-[#1F2937] dark:text-white">
                  {plan.priceLabel}
                </span>
                {plan.originalPrice && (
                  <div className="text-sm text-gray-400 line-through mt-1">
                    ¥{plan.originalPrice}
                  </div>
                )}
              </div>

              {/* 功能列表 */}
              <ul className="space-y-3 mb-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#6B7280] dark:text-gray-400">
                    <svg className="w-5 h-5 text-[#10B981] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* 免费功能提示 */}
              <p className="text-xs text-[#9CA3AF] dark:text-gray-500 mb-4 text-center">
                {plan.freeNote}
              </p>

              {/* CTA按钮 */}
              <Button
                variant={plan.popular ? 'primary' : 'outline'}
                className="w-full"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="mt-12 text-center">
          <p className="text-sm text-[#9CA3AF]">
            先免费做诊断，再决定要不要练。
            <Link href="/diagnose" className="text-[#FF6B35] hover:underline ml-1">
              免费诊断 →
            </Link>
          </p>
        </div>

        {/* 阿搭结语 */}
        <div className="mt-10 flex gap-4 max-w-md mx-auto">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
            搭
          </div>
          <div className="bg-white dark:bg-[#252542] rounded-2xl rounded-tl-md p-4 shadow-lg">
            <p className="text-sm text-[#6B7280] dark:text-gray-400" style={{ whiteSpace: 'pre-wrap' }}>
              {"很多人练完说'早知道就好了'。\n紧张诊断和阿搭聊天不花钱，先试试。"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
