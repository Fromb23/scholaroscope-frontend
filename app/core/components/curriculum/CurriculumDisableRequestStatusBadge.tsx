'use client';

import { Badge } from '@/app/components/ui/Badge';
import {
  getDisableRequestStatusLabel,
  isActiveDisableRequestStatus,
} from '@/app/core/lib/curriculumDisableLifecycle';
import type { CurriculumDisableRequestStatus } from '@/app/core/types/academic';

function getBadgeVariant(status?: CurriculumDisableRequestStatus | null): 'default' | 'info' | 'warning' | 'danger' | 'green' {
  if (isActiveDisableRequestStatus(status)) {
    switch (status) {
      case 'FINALIZING':
        return 'info';
      default:
        return 'warning';
    }
  }

  switch (status) {
    case 'COMPLETED':
      return 'green';
    case 'FAILED':
      return 'danger';
    case 'CANCELLED':
      return 'default';
    default:
      return 'default';
  }
}

export function CurriculumDisableRequestStatusBadge({
  status,
}: {
  status?: CurriculumDisableRequestStatus | null;
}) {
  return (
    <Badge variant={getBadgeVariant(status)} size="sm">
      {getDisableRequestStatusLabel(status)}
    </Badge>
  );
}
