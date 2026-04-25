import { Suspense, lazy } from 'react';

import DeferredSection from '../components/DeferredSection';
import Hero from '../components/Hero';
import Navbar from '../components/Navbar';
import { useDynamicSEO } from './admin/hooks/useDynamicSEO';

const Features = lazy(() => import('../components/Features'));
const FAQ = lazy(() => import('../components/FAQ'));
const Changelog = lazy(() => import('../components/Changelog'));
const Sponsors = lazy(() => import('../components/Sponsors'));
const Footer = lazy(() => import('../components/Footer'));

export default function Landing() {
  useDynamicSEO();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-lime-50/40 to-stone-50 transition-colors duration-500 dark:from-[#04130a] dark:via-[#07180d] dark:to-[#050505]">
      <Navbar />
      <Hero />

      <DeferredSection id="features" placeholderClassName="mx-auto min-h-[420px] max-w-6xl px-4 sm:px-6">
        <Suspense fallback={null}>
          <Features />
        </Suspense>
      </DeferredSection>

      <DeferredSection id="faq" placeholderClassName="mx-auto min-h-[360px] max-w-5xl px-4 sm:px-6">
        <Suspense fallback={null}>
          <FAQ />
        </Suspense>
      </DeferredSection>

      <DeferredSection id="changelog" placeholderClassName="mx-auto min-h-[520px] max-w-5xl px-4 sm:px-6">
        <Suspense fallback={null}>
          <Changelog />
        </Suspense>
      </DeferredSection>

      <DeferredSection id="sponsors" placeholderClassName="mx-auto min-h-[280px] max-w-5xl px-4 sm:px-6">
        <Suspense fallback={null}>
          <Sponsors />
        </Suspense>
      </DeferredSection>

      <DeferredSection id="footer" placeholderClassName="mt-20 min-h-[240px]">
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </DeferredSection>
    </div>
  );
}
