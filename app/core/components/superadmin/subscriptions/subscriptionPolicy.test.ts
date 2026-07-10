import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('subscription policy frontend integration', () => {
  it('organization detail uses subscription UI instead of organization.plan_type as authority', () => {
    const detail = source('app/core/components/superadmin/OrgDetailComponents.tsx');
    expect(detail).toContain('<WorkspaceSubscriptionCard');
    expect(detail).not.toContain('Subscription Plan');
    expect(detail).not.toContain('Change Plan');
    expect(detail).not.toContain('PlanLabels');
    expect(detail).not.toContain('PlanColors');
  });

  it('organization detail no longer submits plan_type from the edit modal', () => {
    const detail = source('app/core/components/superadmin/OrgDetailComponents.tsx');
    expect(detail).toContain('plan_type: org.plan_type');
    expect(detail).not.toContain('plan_type: form.plan_type');
    expect(detail).not.toContain('label="Plan Type"');
  });

  it('active period price and plugins are displayed from backend snapshots', () => {
    const card = source('app/core/components/superadmin/subscriptions/WorkspaceSubscriptionCard.tsx');
    expect(card).toContain('period.total_price');
    expect(card).toContain('period.premium_total');
    expect(card).toContain('period.base_price');
    expect(card).toContain('period.premium_plugin_items.map');
  });

  it('scheduled next-period composition is visually separate from active composition', () => {
    const card = source('app/core/components/superadmin/subscriptions/WorkspaceSubscriptionCard.tsx');
    expect(card).toContain('Active Composition');
    expect(card).toContain('Next Scheduled Composition');
    expect(card).toContain('Scheduled changes affect the next period, not the active one.');
  });

  it('active periods cannot be edited in the history UI', () => {
    const history = source('app/core/components/superadmin/subscriptions/SubscriptionPeriodHistory.tsx');
    expect(history).toContain("period.status === 'DRAFT' || period.status === 'SCHEDULED'");
    expect(history).toContain('editable ? (');
    expect(history).toContain('onEdit(period)');
  });

  it('subscription total is not recomputed from client assumptions', () => {
    const card = source('app/core/components/superadmin/subscriptions/WorkspaceSubscriptionCard.tsx');
    const modal = source('app/core/components/superadmin/subscriptions/SubscriptionPeriodModal.tsx');
    expect(card).toContain('period.total_price');
    expect(card).not.toContain('reduce(');
    expect(modal).not.toContain('total_price');
    expect(modal).not.toContain('premium_total');
  });

  it('premium-plugin selection submits only draft or scheduled composition inputs', () => {
    const modal = source('app/core/components/superadmin/subscriptions/SubscriptionPeriodModal.tsx');
    expect(modal).toContain('premium_plugin_price_ids: selectedPriceIds');
    expect(modal).toContain("period.status === 'DRAFT' || period.status === 'SCHEDULED'");
    expect(modal).not.toContain('total_price_snapshot');
  });

  it('non-superadmins do not see subscription mutation actions', () => {
    const card = source('app/core/components/superadmin/subscriptions/WorkspaceSubscriptionCard.tsx');
    expect(card).toContain('canMutate ? (');
    expect(card).toContain('<SubscriptionPeriodHistory');
    expect(card).toContain('<SubscriptionPeriodModal');
  });

  it('mobile modal/action errors remain in the foreground surface', () => {
    const modal = source('app/core/components/superadmin/subscriptions/SubscriptionPeriodModal.tsx');
    const uiModal = source('app/components/ui/Modal.tsx');
    expect(modal).toContain('<Modal');
    expect(modal).toContain('<AppErrorBanner');
    expect(uiModal).toContain('<ResponsiveActionSheet');
  });
});
