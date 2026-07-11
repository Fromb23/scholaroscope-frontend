'use client';

import { CommercialRateCards } from './CommercialRateCards';

export function CommercialWorkspaceOnboardingPage() {
  return (
    <main className="min-h-screen theme-bg">
      <div className="mx-auto max-w-[1220px] px-4 pb-0 pt-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-blue-700">Additional workspace</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight theme-text">Create another Scholaroscope workspace</h1>
        <p className="theme-muted mt-3 max-w-2xl text-sm leading-6">
          Select the workspace type and confirm a quote before creating the new workspace under your account.
        </p>
      </div>
      <CommercialRateCards authenticated continueBasePath="/register" />
    </main>
  );
}
