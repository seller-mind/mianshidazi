'use client';

import { PricingSection } from '@/components/landing';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-[#1A1A2E]">
      <div className="max-w-md mx-auto px-4 pt-6 pb-4">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B35] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>
      </div>
      <PricingSection />
    </main>
  );
}
