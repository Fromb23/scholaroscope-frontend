import { PageSkeleton } from '@/app/components/ui/loading';

export default function Loading() {
  return (
    <div aria-label="Loading reporting workspace">
      <PageSkeleton variant="report" />
    </div>
  );
}
