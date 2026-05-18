'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

// V9 定价方案
const PRICING_PLANS = [
  {
    id: 'single',
    name: '单次体验',
    price: 9.9,
    priceLabel: '¥9.9',
    description: '试试水',
    features: [
      '1次AI模拟面试',
      '个性化面试报告',
      '紧张类型诊断',
      '24小时有效期',
    ],
    cta: '立即体验',
    popular: false,
  },
  {
    id: 'monthly',
    name: '月卡会员',
    price: 49,
    priceLabel: '¥49/月',
    originalPrice: 99,
    description: '一顿火锅的价格',
    features: [
      '无限次AI模拟面试',
      '个性化面试报告',
      '紧张类型诊断',
      '5种面试官人格',
      '阿搭陪伴聊天',
      '优先客服支持',
    ],
    cta: '开通月卡',
    popular: true,
  },
  {
    id: 'quarterly',
    name: '季卡会员',
    price: 119,
    priceLabel: '¥119/季',
    originalPrice: 279,
    description: '两顿火锅的价格',
    features: [
      '月卡全部权益',
      '面试复盘指导',
      '专属紧张缓解训练',
      '历史报告回顾',
      '一对一咨询1次',
    ],
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
            开始你的第一次练习
          </h2>
          <p className="text-lg text-[#6B7280] dark:text-gray-400">
            给自己一个不再害怕面试的机会
          </p>
        </div>

        {/* V9 初心定价话术 */}
        <div className="bg-gradient-to-r from-[#FF6B35]/5 to-[#E55A28]/5 dark:from-[#FF6B35]/10 dark:to-[#E55A28]/10 rounded-2xl p-6 mb-12 max-w-2xl mx-auto">
          <p className="text-[#6B7280] dark:text-gray-400 text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
            {"¥49 = 一顿火锅\n\n但你知道吗？\n一顿火锅吃完就没了。\n¥49换来的，是：\n\n• 面试前一晚睡不着，有人陪你聊天\n• 被追问到大脑空白，有人告诉你怎么办\n• 等通知焦虑，有人帮你分析有没有戏\n• 崩溃的时候，有人接住你\n\n¥49买的不是一个工具，是一个朋友。"}
          </p>
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
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#6B7280] dark:text-gray-400">
                    <svg className="w-5 h-5 text-[#10B981] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

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
            先做诊断，再决定要不要买。
            <Link href="/diagnose" className="text-[#FF6B35] hover:underline ml-1">
              免费诊断
            </Link>
          </p>
        </div>

        {/* 阿搭结语 */}
        <div className="mt-10 flex gap-4 max-w-md mx-auto">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
            阿
          </div>
          <div className="bg-white dark:bg-[#252542] rounded-2xl rounded-tl-md p-4 shadow-lg">
            <p className="text-sm text-[#6B7280] dark:text-gray-400" style={{ whiteSpace: 'pre-wrap' }}>
              {"其实很多人第一次用完就说'早知道就好了'。\n希望你不是其中之一。"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
