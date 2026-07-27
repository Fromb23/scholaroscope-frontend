import { RevenueCycleDetailPage } from '@/app/core/components/revenue/RevenueCycleDetailPage';

export default async function Page({ params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  return <RevenueCycleDetailPage cycleId={cycleId} />;
}
