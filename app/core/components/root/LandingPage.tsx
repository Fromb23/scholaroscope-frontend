'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/app/context/AuthContext';
import { redirectToPlatformConsole } from '@/app/core/auth/platformRedirect';
import { PublicHeader } from '@/app/core/components/public/PublicHeader';
import { HeroSection } from '@/app/core/components/public/HeroSection';
import { HowItWorksSection } from '@/app/core/components/public/HowItWorksSection';
import { FeatureSection } from '@/app/core/components/public/FeatureSection';
import { AudienceSection } from '@/app/core/components/public/AudienceSection';
import { CommercialSection } from '@/app/core/components/public/CommercialSection';
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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <PublicHeader />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeatureSection />
        <AudienceSection />
        <CommercialSection />
      </main>
      <PublicFooter />
    </div>
  );
}
