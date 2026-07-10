'use client';

import { Check } from 'lucide-react';

import type { PlanPremiumPluginPrice } from '@/app/core/types/subscriptions';

interface PremiumPluginSelectorProps {
  prices: PlanPremiumPluginPrice[];
  selectedIds: number[];
  onChange: (nextIds: number[]) => void;
  disabled?: boolean;
}

function formatMoney(value: string, currency = 'KES'): string {
  return `${currency} ${value}`;
}

export function PremiumPluginSelector({
  prices,
  selectedIds,
  onChange,
  disabled = false,
}: PremiumPluginSelectorProps) {
  if (!prices.length) {
    return (
      <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm theme-muted">
        No active premium plugin prices for this plan.
      </div>
    );
  }

  const toggle = (priceId: number) => {
    if (disabled) return;
    if (selectedIds.includes(priceId)) {
      onChange(selectedIds.filter((id) => id !== priceId));
      return;
    }
    onChange([...selectedIds, priceId]);
  };

  return (
    <div className="space-y-2">
      {prices.map((price) => {
        const selected = selectedIds.includes(price.id);
        return (
          <button
            type="button"
            key={price.id}
            disabled={disabled}
            onClick={() => toggle(price.id)}
            className={`theme-focus-ring flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
              selected
                ? 'theme-info-surface border-[color:var(--color-primary)]'
                : 'theme-border theme-surface-elevated hover:theme-surface-muted'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <span className="min-w-0">
              <span className="block font-medium theme-text">{price.plugin_name}</span>
              <span className="block text-xs theme-muted">{price.plugin_key}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-medium theme-text">{formatMoney(price.term_price)}</span>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                selected ? 'border-[color:var(--color-primary)] theme-surface-elevated' : 'theme-border'
              }`}>
                {selected ? <Check className="h-3.5 w-3.5 text-[color:var(--color-primary)]" /> : null}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
