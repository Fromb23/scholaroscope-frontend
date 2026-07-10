'use client';

import { useEffect, useMemo, useState } from 'react';

import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import type { AppError } from '@/app/core/errors';
import type {
  PlanPremiumPluginPrice,
  SubscriptionPeriodPayload,
  SubscriptionPlan,
  WorkspaceSubscriptionPeriod,
} from '@/app/core/types/subscriptions';

import { PremiumPluginSelector } from './PremiumPluginSelector';

interface SubscriptionPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: number;
  period?: WorkspaceSubscriptionPeriod | null;
  plans: SubscriptionPlan[];
  prices: PlanPremiumPluginPrice[];
  onSave: (payload: SubscriptionPeriodPayload, periodId?: number) => Promise<void>;
  submitting?: boolean;
  error?: AppError | null;
}

function selectedPriceIdsForPeriod(
  period: WorkspaceSubscriptionPeriod | null | undefined,
  prices: PlanPremiumPluginPrice[]
): number[] {
  if (!period) return [];
  const pluginIds = new Set(period.plugin_items.map((item) => item.plugin));
  return prices
    .filter((price) => price.plan === period.plan && pluginIds.has(price.plugin))
    .map((price) => price.id);
}

function modalValidationError(message: string): AppError {
  return {
    kind: 'validation',
    title: 'Check subscription period',
    message,
    retryable: false,
    severity: 'warning',
    channel: 'inline',
  };
}

export function SubscriptionPeriodModal({
  isOpen,
  onClose,
  organizationId,
  period,
  plans,
  prices,
  onSave,
  submitting = false,
  error = null,
}: SubscriptionPeriodModalProps) {
  const editable = !period || period.status === 'DRAFT' || period.status === 'SCHEDULED';
  const defaultPlanId = period?.plan ?? plans[0]?.id ?? 0;
  const [planId, setPlanId] = useState(defaultPlanId);
  const [startsOn, setStartsOn] = useState(period?.starts_on ?? '');
  const [notes, setNotes] = useState(period?.notes ?? '');
  const [selectedPriceIds, setSelectedPriceIds] = useState<number[]>(() =>
    selectedPriceIdsForPeriod(period, prices)
  );
  const [localError, setLocalError] = useState<AppError | null>(null);

  useEffect(() => {
    setPlanId(period?.plan ?? plans[0]?.id ?? 0);
    setStartsOn(period?.starts_on ?? '');
    setNotes(period?.notes ?? '');
    setSelectedPriceIds(selectedPriceIdsForPeriod(period, prices));
    setLocalError(null);
  }, [isOpen, period, plans, prices]);

  const selectedPlan = plans.find((plan) => plan.id === planId) ?? null;
  const planPrices = useMemo(
    () => prices.filter((price) => price.plan === planId && price.is_active),
    [planId, prices]
  );

  const handleSave = async () => {
    if (!editable) {
      setLocalError(modalValidationError('Active periods cannot be edited.'));
      return;
    }
    if (!planId || !startsOn) {
      setLocalError(modalValidationError('Plan and start date are required.'));
      return;
    }
    setLocalError(null);
    await onSave(
      {
        organization_id: organizationId,
        plan_id: planId,
        starts_on: startsOn,
        premium_plugin_price_ids: selectedPriceIds,
        notes,
      },
      period?.id
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={period ? 'Edit Subscription Period' : 'Create Subscription Period'}
      size="lg"
    >
      <div className="space-y-4">
        {error ? <AppErrorBanner error={error} onDismiss={() => undefined} /> : null}
        {localError ? <AppErrorBanner error={localError} onDismiss={() => setLocalError(null)} /> : null}

        {period?.status === 'SCHEDULED' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Scheduled changes apply to the next period, not the active subscription.
          </div>
        ) : null}

        <Select
          label="Standard Plan"
          value={planId ? String(planId) : ''}
          onChange={(event) => {
            const nextPlanId = Number(event.target.value);
            setPlanId(nextPlanId);
            setSelectedPriceIds([]);
          }}
          disabled={!editable || submitting}
          options={[
            { value: '', label: 'Select plan' },
            ...plans.map((plan) => ({
              value: String(plan.id),
              label: `${plan.name} v${plan.version} (${plan.currency} ${plan.standard_term_price})`,
            })),
          ]}
        />

        <Input
          label="Starts On"
          type="date"
          value={startsOn}
          onChange={(event) => setStartsOn(event.target.value)}
          disabled={!editable || submitting}
          required
        />

        <div>
          <label className="mb-1 block text-sm font-medium theme-text">Premium Plugins</label>
          <PremiumPluginSelector
            prices={planPrices}
            selectedIds={selectedPriceIds}
            onChange={setSelectedPriceIds}
            disabled={!editable || submitting}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium theme-text">Notes</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={!editable || submitting}
            rows={3}
            className="theme-focus-ring theme-input theme-surface-elevated min-h-[88px] w-full rounded-lg px-4 py-2"
          />
        </div>

        {selectedPlan ? (
          <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="theme-muted">Base snapshot on save</span>
              <span className="font-medium theme-text">
                {selectedPlan.currency} {selectedPlan.standard_term_price}
              </span>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 border-t theme-border pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting || !editable}>
            {submitting ? 'Saving...' : 'Save Period'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
