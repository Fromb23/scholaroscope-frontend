'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Plus } from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { getAppError, resolveSuperAdminError } from '@/app/core/errors';
import type { AppError } from '@/app/core/errors';
import type { Organization } from '@/app/core/types/organization';
import type {
  SerializedSubscriptionPeriod,
  SubscriptionPeriodPayload,
  WorkspaceSubscriptionPeriod,
} from '@/app/core/types/subscriptions';
import { useWorkspaceSubscriptionManager } from '@/app/core/hooks/useSubscriptions';

import { SubscriptionPeriodHistory } from './SubscriptionPeriodHistory';
import { SubscriptionPeriodModal } from './SubscriptionPeriodModal';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge';

interface WorkspaceSubscriptionCardProps {
  organization: Organization;
  canMutate: boolean;
}

function money(currency: string | null | undefined, value: string | null | undefined): string {
  return `${currency ?? 'KES'} ${value ?? '0.00'}`;
}

function SnapshotBlock({
  title,
  period,
}: {
  title: string;
  period: SerializedSubscriptionPeriod | null;
}) {
  if (!period) return null;
  return (
    <div className="rounded-lg border theme-border theme-surface-elevated px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold theme-text">{title}</p>
          <p className="mt-1 text-sm theme-muted">
            {period.plan_name} v{period.plan_version} • {period.starts_on} to {period.ends_on}
          </p>
          <p className="mt-1 text-xs theme-subtle">Last covered date: {period.last_covered_date}</p>
        </div>
        <SubscriptionStatusBadge status={period.status} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md theme-surface-muted px-3 py-2">
          <p className="text-xs theme-subtle">Base</p>
          <p className="font-medium theme-text">{money(period.currency, period.base_price)}</p>
        </div>
        <div className="rounded-md theme-surface-muted px-3 py-2">
          <p className="text-xs theme-subtle">Premium</p>
          <p className="font-medium theme-text">{money(period.currency, period.premium_total)}</p>
        </div>
        <div className="rounded-md theme-surface-muted px-3 py-2">
          <p className="text-xs theme-subtle">Total</p>
          <p className="font-semibold theme-text">{money(period.currency, period.total_price)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {period.premium_plugin_items.length ? period.premium_plugin_items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="theme-muted">{item.plugin_name}</span>
            <span className="font-medium theme-text">{money(period.currency, item.price)}</span>
          </div>
        )) : (
          <p className="text-sm theme-muted">No premium plugins in this period.</p>
        )}
      </div>
    </div>
  );
}

export function WorkspaceSubscriptionCard({
  organization,
  canMutate,
}: WorkspaceSubscriptionCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<WorkspaceSubscriptionPeriod | null>(null);
  const [actionError, setActionError] = useState<AppError | null>(null);
  const manager = useWorkspaceSubscriptionManager(organization.id, {
    enabled: Boolean(organization.id),
    loadCommercialPolicy: canMutate,
  });
  const summary = manager.summaryQuery.data;
  const periods = manager.periodsQuery.data;
  const plans = manager.plansQuery.data ?? [];
  const prices = manager.pricesQuery.data ?? [];
  const actionBusy = Object.values(manager.actions).some((mutation) => mutation.isPending);

  const sortedPeriods = useMemo(
    () => [...(periods ?? [])].sort((left, right) => right.starts_on.localeCompare(left.starts_on) || right.id - left.id),
    [periods]
  );

  const openCreate = () => {
    setActionError(null);
    setEditingPeriod(null);
    setModalOpen(true);
  };

  const openEdit = (period: WorkspaceSubscriptionPeriod) => {
    setActionError(null);
    setEditingPeriod(period);
    setModalOpen(true);
  };

  const handleSave = async (payload: SubscriptionPeriodPayload, periodId?: number) => {
    setActionError(null);
    try {
      if (periodId) {
        await manager.actions.updatePeriod.mutateAsync({ periodId, payload });
      } else {
        await manager.actions.createPeriod.mutateAsync(payload);
      }
      setModalOpen(false);
      setEditingPeriod(null);
    } catch (error) {
      setActionError(getAppError(error) ?? resolveSuperAdminError(error, {
        action: 'save',
        entityLabel: 'subscription period',
        role: 'SUPERADMIN',
        channel: 'inline',
      }));
      throw error;
    }
  };

  const runAction = async (
    fn: () => Promise<WorkspaceSubscriptionPeriod>,
    fallback: string
  ) => {
    setActionError(null);
    try {
      await fn();
    } catch (error) {
      const resolved = getAppError(error) ?? resolveSuperAdminError(error, {
        action: 'save',
        entityLabel: 'subscription period',
        role: 'SUPERADMIN',
        channel: 'inline',
      });
      setActionError({ ...resolved, message: resolved.message || fallback });
    }
  };

  if (manager.summaryQuery.isLoading) {
    return (
      <Card>
        <LoadingSpinner fullScreen={false} message="Loading subscription" showMessage={false} />
      </Card>
    );
  }

  const status = summary?.renewal_required
    ? 'RENEWAL_REQUIRED'
    : summary?.current_active_period?.status
    ?? (summary?.term_gate_enabled ? 'EXPIRED' : 'NOT_ENABLED');

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Workspace Subscription</CardTitle>
          <p className="mt-1 text-sm theme-muted">
            Standard base subscription with premium plugin snapshots.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SubscriptionStatusBadge status={status} />
          {canMutate ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New Period
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionError ? <AppErrorBanner error={actionError} onDismiss={() => setActionError(null)} /> : null}
        {manager.summaryQuery.error ? (
          <AppErrorBanner
            error={resolveSuperAdminError(manager.summaryQuery.error, {
              action: 'load',
              entityLabel: 'workspace subscription',
              role: canMutate ? 'SUPERADMIN' : 'ADMIN',
              channel: 'inline',
            })}
            onDismiss={() => undefined}
          />
        ) : null}

        {summary?.renewal_required ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{summary.term_creation_message}</span>
          </div>
        ) : null}

        {!summary?.term_gate_enabled ? (
          <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm theme-muted">
            This workspace is still on the compatibility bridge until its first subscription activation.
          </div>
        ) : null}

        <SnapshotBlock title="Active Composition" period={summary?.current_active_period ?? null} />

        {summary?.next_scheduled_period ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
              <CalendarClock className="h-4 w-4" />
              Scheduled changes affect the next period, not the active one.
            </div>
            <SnapshotBlock title="Next Scheduled Composition" period={summary.next_scheduled_period} />
          </div>
        ) : null}

        {canMutate ? (
          <SubscriptionPeriodHistory
            periods={sortedPeriods}
            canMutate={canMutate}
            onEdit={openEdit}
            onSchedule={(period) => runAction(
              () => manager.actions.schedulePeriod.mutateAsync(period.id),
              'Failed to schedule subscription period.'
            )}
            onActivate={(period) => runAction(
              () => manager.actions.activatePeriod.mutateAsync(period.id),
              'Failed to activate subscription period.'
            )}
            onCancel={(period) => runAction(
              () => manager.actions.cancelPeriod.mutateAsync(period.id),
              'Failed to cancel subscription period.'
            )}
          />
        ) : null}
      </CardContent>

      {canMutate ? (
        <SubscriptionPeriodModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingPeriod(null);
          }}
          organizationId={organization.id}
          period={editingPeriod}
          plans={plans.filter((plan) => plan.is_active && plan.workspace_type === organization.org_type)}
          prices={prices}
          onSave={handleSave}
          submitting={actionBusy}
          error={actionError}
        />
      ) : null}
    </Card>
  );
}
