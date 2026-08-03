import { RevenueCycleDetailPage } from '@/app/core/components/revenue/RevenueCycleDetailPage';

export default function Page({ params }: { params: { cycleId: string } }) {
  return <RevenueCycleDetailPage cycleId={params.cycleId} />;
}
