import { PublicFooter } from '@/app/core/components/public/PublicFooter';
import { PublicHeader } from '@/app/core/components/public/PublicHeader';
import { CommercialRateCards } from '@/app/core/components/commercial/CommercialRateCards';

export function PublicGetStartedPage() {
  return (
    <div className="min-h-screen theme-app-bg theme-text">
      <PublicHeader />
      <main className="pt-16">
        <CommercialRateCards />
      </main>
      <PublicFooter />
    </div>
  );
}
