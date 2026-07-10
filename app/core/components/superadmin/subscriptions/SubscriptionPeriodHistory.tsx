'use client';

import { Button } from '@/app/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import type { WorkspaceSubscriptionPeriod } from '@/app/core/types/subscriptions';

import { SubscriptionStatusBadge } from './SubscriptionStatusBadge';

interface SubscriptionPeriodHistoryProps {
  periods: WorkspaceSubscriptionPeriod[];
  canMutate: boolean;
  onEdit: (period: WorkspaceSubscriptionPeriod) => void;
  onSchedule: (period: WorkspaceSubscriptionPeriod) => void;
  onActivate: (period: WorkspaceSubscriptionPeriod) => void;
  onCancel: (period: WorkspaceSubscriptionPeriod) => void;
}

export function SubscriptionPeriodHistory({
  periods,
  canMutate,
  onEdit,
  onSchedule,
  onActivate,
  onCancel,
}: SubscriptionPeriodHistoryProps) {
  if (!periods.length) {
    return (
      <div className="rounded-lg border theme-border theme-surface-muted px-4 py-4 text-sm theme-muted">
        No subscription periods yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Premium</TableHead>
            {canMutate ? <TableHead>Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map((period) => {
            const editable = period.status === 'DRAFT' || period.status === 'SCHEDULED';
            return (
              <TableRow key={period.id}>
                <TableCell><SubscriptionStatusBadge status={period.status} /></TableCell>
                <TableCell className="theme-muted">
                  {period.starts_on} to {period.ends_on}
                </TableCell>
                <TableCell className="font-medium theme-text">
                  {period.currency_snapshot} {period.total_price_snapshot}
                </TableCell>
                <TableCell className="theme-muted">
                  {period.plugin_items.length || 'None'}
                </TableCell>
                {canMutate ? (
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {editable ? (
                        <Button size="sm" variant="ghost" onClick={() => onEdit(period)}>Edit</Button>
                      ) : null}
                      {period.status === 'DRAFT' ? (
                        <Button size="sm" variant="ghost" onClick={() => onSchedule(period)}>Schedule</Button>
                      ) : null}
                      {period.status === 'DRAFT' || period.status === 'SCHEDULED' ? (
                        <Button size="sm" variant="ghost" onClick={() => onActivate(period)}>Activate</Button>
                      ) : null}
                      {period.status !== 'EXPIRED' && period.status !== 'CANCELLED' ? (
                        <Button size="sm" variant="ghost" onClick={() => onCancel(period)}>Cancel</Button>
                      ) : null}
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
