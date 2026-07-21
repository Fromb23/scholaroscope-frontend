'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/app/context/AuthContext';
import { redirectToPlatformConsole } from '@/app/core/auth/platformRedirect';
import { PublicHeader } from '@/app/core/components/public/PublicHeader';
import { HeroSection } from '@/app/core/components/public/HeroSection';
import { FaqSection } from '@/app/core/components/public/FaqSection';
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
        <FaqSection />
      </main>
      <PublicFooter />
    </div>
  );
}
