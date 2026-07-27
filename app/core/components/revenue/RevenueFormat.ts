import type { WorkspaceCapabilities } from '@/app/core/types/auth';

export const DEFAULT_REVENUE_TIERS = [
  { lower_bound: '0.00', upper_bound: '49.99', amount: '0.00', label: 'Below 50%' },
  { lower_bound: '50.00', upper_bound: '74.99', amount: '3000.00', label: '50%–74.99%' },
  { lower_bound: '75.00', upper_bound: '89.99', amount: '5000.00', label: '75%–89.99%' },
  { lower_bound: '90.00', upper_bound: '100.00', amount: '7000.00', label: '90%–100%' },
];

export function money(value: string | number | null | undefined, currency = 'KES'): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return `${currency} 0`;
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function percent(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '0%';
  return `${Math.round(numeric * 10000) / 100}%`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not run';
  return new Date(value).toLocaleString();
}

export function blockersFrom(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'object' && value !== null && 'blockers' in value) {
    const blockers = (value as { blockers?: unknown }).blockers;
    return Array.isArray(blockers) ? blockers.map(String) : [];
  }
  return [];
}

export function revenueCapability(capabilities: WorkspaceCapabilities, key: 'policy' | 'cycles' | 'calculate' | 'review' | 'approve'): boolean {
  if (key === 'policy') return Boolean(capabilities.can_manage_revenue_policy || capabilities.revenue?.can_manage_policy);
  if (key === 'cycles') return Boolean(capabilities.can_manage_revenue_cycles || capabilities.revenue?.can_manage_cycles);
  if (key === 'calculate') return Boolean(capabilities.can_run_revenue_calculations || capabilities.revenue?.can_run_calculations);
  if (key === 'review') return Boolean(capabilities.can_review_revenue_statements || capabilities.revenue?.can_review_statements);
  return Boolean(capabilities.can_approve_revenue_cycles || capabilities.revenue?.can_approve_cycles);
}
