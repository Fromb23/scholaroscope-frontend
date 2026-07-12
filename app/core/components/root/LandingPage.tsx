'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/app/context/AuthContext';
import { redirectToPlatformConsole } from '@/app/core/auth/platformRedirect';
import { PublicHeader } from '@/app/core/components/public/PublicHeader';
import { HeroSection } from '@/app/core/components/public/HeroSection';
import { ProblemSection } from '@/app/core/components/public/ProblemSection';
import { HowItWorksSection } from '@/app/core/components/public/HowItWorksSection';
import { EvidenceDashboardSection } from '@/app/core/components/public/EvidenceDashboardSection';
import { ReportAudienceSection } from '@/app/core/components/public/ReportAudienceSection';
import { AudienceSection } from '@/app/core/components/public/AudienceSection';
import { EvidenceIntegritySection } from '@/app/core/components/public/EvidenceIntegritySection';
import { CommercialSection } from '@/app/core/components/public/CommercialSection';
import { FooterCtaSection } from '@/app/core/components/public/FooterCtaSection';
import { PublicFooter } from '@/app/core/components/public/PublicFooter';

export function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) {
      return;
    }
    if (user.is_superadmin) {
      redirectToPlatformConsole('/login');
      return;
    }
    router.replace('/dashboard');
  }, [loading, router, user]);

  return (
    <div className="min-h-screen theme-app-bg theme-text">
      <PublicHeader />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <EvidenceDashboardSection />
        <ReportAudienceSection />
        <AudienceSection />
        <EvidenceIntegritySection />
        <CommercialSection />
        <FooterCtaSection />
      </main>
      <PublicFooter />
    </div>
  );
}
