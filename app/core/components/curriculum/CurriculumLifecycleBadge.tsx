'use client';

import { Badge } from '@/app/components/ui/Badge';
import { getCurriculumStatusLabel } from '@/app/core/lib/curriculumLifecycle';
import type { CurriculumOfferingStatus } from '@/app/core/types/academic';

function getBadgeVariant(status?: CurriculumOfferingStatus | null): 'default' | 'info' | 'warning' | 'danger' | 'green' | 'purple' {
  switch (status) {
    case 'ACTIVE':
      return 'green';
    case 'DISABLE_REQUESTED':
      return 'warning';
    case 'DRAINING':
      return 'warning';
    case 'FINALIZING':
      return 'purple';
    case 'DISABLED':
      return 'default';
    case 'REACTIVATING':
      return 'info';
    case 'FAILED':
      return 'danger';
    default:
      return 'default';
  }
}

export function CurriculumLifecycleBadge({
  status,
}: {
  status?: CurriculumOfferingStatus | null;
}) {
  return (
    <Badge variant={getBadgeVariant(status)} size="sm">
      {getCurriculumStatusLabel(status)}
    </Badge>
  );
}
