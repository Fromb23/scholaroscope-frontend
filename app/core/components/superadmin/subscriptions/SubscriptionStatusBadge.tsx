import { Badge } from '@/app/components/ui/Badge';
import type { SubscriptionPeriodStatus } from '@/app/core/types/subscriptions';

interface SubscriptionStatusBadgeProps {
  status?: SubscriptionPeriodStatus | 'RENEWAL_REQUIRED' | 'NOT_ENABLED';
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  if (!status || status === 'NOT_ENABLED') {
    return <Badge variant="default">Compatibility</Badge>;
  }
  if (status === 'RENEWAL_REQUIRED') {
    return <Badge variant="warning">Renewal required</Badge>;
  }
  const variant = {
    DRAFT: 'default',
    SCHEDULED: 'info',
    ACTIVE: 'success',
    EXPIRED: 'warning',
    CANCELLED: 'danger',
  }[status] as 'default' | 'info' | 'success' | 'warning' | 'danger';

  return <Badge variant={variant}>{status.replace('_', ' ')}</Badge>;
}

