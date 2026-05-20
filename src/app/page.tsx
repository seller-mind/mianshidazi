'use client';

import Link from 'next/link';
import {
  HeroSection,
  PainPointSection,
  CounterintuitiveSection,
  ProductShowcaseSection,
  PricingSection,
  Footer,
} from '@/components/landing';
import CookieConsent from '@/components/CookieConsent';
import { Navbar } from '@/components/Navbar';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      {/* 五屏落地页 - V9更新 */}
      <HeroSection />
      <PainPointSection />
      <CounterintuitiveSection />
      <ProductShowcaseSection />
      <PricingSection />

      {/* 页脚 - 使用共享Footer组件 */}
      <Footer />

      {/* Cookie同意弹窗 */}
      <CookieConsent />
    </main>
  );
}
