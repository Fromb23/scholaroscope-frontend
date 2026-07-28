import type { WorkspaceCapabilities } from '@/app/core/types/auth';
import type {
  RevenueBlocker,
  TeacherContributionTier,
} from '@/app/core/types/institutionalRevenue';

export interface RevenueTierFormRow {
  minimum_percentage: string;
  maximum_percentage: string;
  projected_amount: string;
  label?: string;
}

export const DEFAULT_REVENUE_TIERS: TeacherContributionTier[] = [
  { minimum_ratio: '0.0000', maximum_ratio: '0.4999', projected_amount: '0.00', label: 'Below 50%' },
  { minimum_ratio: '0.5000', maximum_ratio: '0.7499', projected_amount: '3000.00', label: '50%-74.99%' },
  { minimum_ratio: '0.7500', maximum_ratio: '0.8999', projected_amount: '5000.00', label: '75%-89.99%' },
  { minimum_ratio: '0.9000', maximum_ratio: '1.0000', projected_amount: '7000.00', label: '90%-100%' },
];

export function tierToForm(tier: TeacherContributionTier): RevenueTierFormRow {
  return {
    minimum_percentage: String(Number(tier.minimum_ratio) * 100),
    maximum_percentage: String(Number(tier.maximum_ratio) * 100),
    projected_amount: tier.projected_amount,
    label: tier.label,
  };
}

export function tierFromForm(row: RevenueTierFormRow): TeacherContributionTier {
  return {
    minimum_ratio: (Number(row.minimum_percentage || 0) / 100).toFixed(4),
    maximum_ratio: (Number(row.maximum_percentage || 0) / 100).toFixed(4),
    projected_amount: Number(row.projected_amount || 0).toFixed(2),
    label: row.label,
  };
}

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

export function blockersFrom(value: unknown): RevenueBlocker[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'object' && item !== null && 'code' in item && 'message' in item) {
        const blocker = item as Partial<RevenueBlocker>;
        return {
          code: String(blocker.code ?? 'blocker'),
          message: String(blocker.message ?? blocker.code ?? 'Revenue blocker'),
          details: (
            blocker.details && typeof blocker.details === 'object'
              ? blocker.details as Record<string, unknown>
              : {}
          ),
        };
      }
      return { code: String(item), message: String(item), details: {} };
    });
  }
  if (typeof value === 'object' && value !== null && 'blockers' in value) {
    return blockersFrom((value as { blockers?: unknown }).blockers);
  }
  return [];
}

export function revenueCapability(
  capabilities: WorkspaceCapabilities,
  key: 'policy' | 'cycles' | 'calculate' | 'review' | 'approve',
): boolean {
  if (key === 'policy') return Boolean(capabilities.can_manage_revenue_policy || capabilities.revenue?.can_manage_policy);
  if (key === 'cycles') return Boolean(capabilities.can_manage_revenue_cycles || capabilities.revenue?.can_manage_cycles);
  if (key === 'calculate') return Boolean(capabilities.can_run_revenue_calculations || capabilities.revenue?.can_run_calculations);
  if (key === 'review') return Boolean(capabilities.can_review_revenue_statements || capabilities.revenue?.can_review_statements);
  return Boolean(capabilities.can_approve_revenue_cycles || capabilities.revenue?.can_approve_cycles);
}
