'use client';

import { CommercialRateCards } from './CommercialRateCards';

export function CommercialWorkspaceOnboardingPage() {
  return (
    <main className="min-h-screen theme-bg px-4 py-8">
      <CommercialRateCards authenticated continueBasePath="/register" />
    </main>
  );
}
