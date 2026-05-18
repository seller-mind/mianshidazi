'use client';

import { PRICING_PLANS } from '@/lib/ai/config';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

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

        {/* 定价卡片 */}
        <div className="grid md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.id}
              variant={plan.isPopular ? 'highlight' : 'default'}
              className={`relative ${plan.isPopular ? 'ring-2 ring-[#FF6B35]' : ''}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FF6B35] text-white text-xs font-medium rounded-full">
                  最受欢迎
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="text-center">{plan.name}</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold text-[#1F2937] dark:text-white">
                    ¥{plan.price}
                  </span>
                  {plan.originalPrice && (
                    <>
                      <span className="text-lg text-gray-400 line-through ml-2">
                        ¥{plan.originalPrice}
                      </span>
                      <div className="text-sm text-[#FF6B35] mt-1">
                        省 ¥{plan.originalPrice - plan.price}
                      </div>
                    </>
                  )}
                </div>

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

                <Button
                  variant={plan.isPopular ? 'primary' : 'outline'}
                  className="w-full"
                >
                  立即开通
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="mt-12 text-center">
          <p className="text-sm text-[#9CA3AF]">
            先做诊断，再决定要不要买。
            <a href="/diagnose" className="text-[#FF6B35] hover:underline ml-1">
              免费诊断
            </a>
          </p>
        </div>

        {/* 阿搭结语 */}
        <div className="mt-10 flex gap-4 max-w-md mx-auto">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white font-medium flex-shrink-0">
            阿
          </div>
          <div className="bg-white dark:bg-[#252542] rounded-2xl rounded-tl-md p-4 shadow-lg">
            <p className="text-sm text-[#6B7280] dark:text-gray-400">
              "其实很多人第一次用完就说'早知道就好了'。希望你不是其中之一。"
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
