'use client';

import { PublicHeader } from '@/app/core/components/public/PublicHeader';
import { HeroSection } from '@/app/core/components/public/HeroSection';
import { ProblemSection } from '@/app/core/components/public/ProblemSection';
import { WorkflowSection } from '@/app/core/components/public/WorkflowSection';
import { ProductPreviewSection } from '@/app/core/components/public/ProductPreviewSection';
import { AudienceSection } from '@/app/core/components/public/AudienceSection';
import { TrustSection } from '@/app/core/components/public/TrustSection';
import { FaqSection } from '@/app/core/components/public/FaqSection';
import { FinalCtaSection } from '@/app/core/components/public/FinalCtaSection';
import { PublicFooter } from '@/app/core/components/public/PublicFooter';

export function LandingPage() {
  return (
    <div className="min-h-screen theme-app-bg theme-text">
      <PublicHeader variant="landing" />
      <main>
        <HeroSection />
        <ProblemSection />
        <WorkflowSection />
        <ProductPreviewSection />
        <AudienceSection />
        <TrustSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <PublicFooter />
    </div>
  );
}
