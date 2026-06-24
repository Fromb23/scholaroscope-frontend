import { CardSkeleton } from '@/app/components/ui/loading';

export function CBCProgressSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <CardSkeleton lines={3} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} lines={2} />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <CardSkeleton key={index} lines={4} />)}
      </div>
      <CardSkeleton lines={8} />
    </div>
  );
}
