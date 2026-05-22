'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Suspense } from 'react';

function HomeContent() {
  const searchParams = useSearchParams();

  // Store referral code from URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('msd_ref', ref);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('pricing') === 'true') {
      setTimeout(() => {
        const el = document.getElementById('pricing');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }, [searchParams]);

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* 五屏落地页 - V9更新 */}
      <HeroSection />
      <PainPointSection />
      <CounterintuitiveSection />
      <ProductShowcaseSection />
      <div id="pricing">
        <PricingSection />
      </div>

      {/* 页脚 - 使用共享Footer组件 */}
      <Footer />

      {/* Cookie同意弹窗 */}
      <CookieConsent />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
