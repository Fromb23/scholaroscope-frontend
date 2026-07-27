'use client';

import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { LoadingMessage } from '@/app/components/ui/loading';
import { useRevenuePolicies } from '@/app/core/hooks/useInstitutionalRevenue';
import { DEFAULT_REVENUE_TIERS, money, revenueCapability } from './RevenueFormat';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { RevenuePolicyPayload, TeacherContributionTier } from '@/app/core/types/institutionalRevenue';

export function RevenuePoliciesPage() {
  const { capabilities } = useAuth();
  const { policies, loading, error, createPolicy, updatePolicy, activatePolicy } = useRevenuePolicies();
  const canManage = revenueCapability(capabilities, 'policy');
  const [draftId, setDraftId] = useState<string | null>(null);
  const editableDraft = policies.find((policy) => policy.id === draftId && policy.status === 'DRAFT') ?? null;
  const [learnerContribution, setLearnerContribution] = useState('400.00');
  const [minimumContribution, setMinimumContribution] = useState('400.00');
  const [tiers, setTiers] = useState<TeacherContributionTier[]>(DEFAULT_REVENUE_TIERS);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedPolicies = useMemo(
    () => [...policies].sort((left, right) => right.version - left.version),
    [policies],
  );

  const loadDraft = (policyId: string) => {
    const policy = policies.find((item) => item.id === policyId);
    if (!policy || policy.status !== 'DRAFT') return;
    setDraftId(policy.id);
    setLearnerContribution(policy.learner_contribution_amount);
    setMinimumContribution(policy.minimum_learner_contribution_amount);
    setTiers(policy.teacher_payout_tiers);
    setActionError(null);
  };

  const payload = (): RevenuePolicyPayload => ({
    learner_contribution_amount: learnerContribution,
    minimum_learner_contribution_amount: minimumContribution,
    teacher_payout_tiers: tiers,
    currency: 'KES',
  });

  const saveDraft = async () => {
    setSaving(true);
    setActionError(null);
    try {
      if (editableDraft) {
        await updatePolicy(editableDraft.id, payload());
      } else {
        const created = await createPolicy(payload());
        setDraftId(created.id);
      }
    } catch (err) {
      setActionError(resolveErrorMessage(err as ApiError, 'Unable to save revenue policy.'));
    } finally {
      setSaving(false);
    }
  };

  const activate = async (policyId: string) => {
    setSaving(true);
    setActionError(null);
    try {
      await activatePolicy(policyId);
      setDraftId(null);
    } catch (err) {
      setActionError(resolveErrorMessage(err as ApiError, 'Unable to activate revenue policy.'));
    } finally {
      setSaving(false);
    }
  };

  const updateTier = (index: number, field: keyof TeacherContributionTier, value: string) => {
    setTiers((current) => current.map((tier, tierIndex) => (
      tierIndex === index ? { ...tier, [field]: value } : tier
    )));
  };

  if (loading) return <LoadingMessage title="Loading revenue policies..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold theme-text">Revenue policy management</h1>
        <p className="mt-1 text-sm theme-muted">
          Configure Projected learner contribution and teacher threshold tiers. Active and retired versions are immutable.
        </p>
      </div>

      {(error || actionError) ? (
        <Card className="border border-red-200 bg-red-50 text-sm text-red-800">{error ?? actionError}</Card>
      ) : null}

      {canManage ? (
        <Card>
          <h2 className="text-lg font-semibold theme-text">{editableDraft ? `Edit draft version ${editableDraft.version}` : 'Create draft policy'}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Projected learner contribution"
              type="number"
              min="0"
              step="0.01"
              value={learnerContribution}
              onChange={(event) => setLearnerContribution(event.target.value)}
              helperText="KES-aware amount per learner-seat for one term."
            />
            <Input
              label="Minimum learner contribution validation"
              type="number"
              min="0"
              step="0.01"
              value={minimumContribution}
              onChange={(event) => setMinimumContribution(event.target.value)}
            />
          </div>

          <div className="mt-6">
            <h3 className="font-semibold theme-text">Teacher threshold tiers</h3>
            <div className="mt-3 space-y-3">
              {tiers.map((tier, index) => (
                <div key={`${tier.label}-${index}`} className="grid gap-3 rounded-xl border theme-border p-3 md:grid-cols-4">
                  <Input label="Lower %" type="number" step="0.01" value={tier.lower_bound} onChange={(event) => updateTier(index, 'lower_bound', event.target.value)} />
                  <Input label="Upper %" type="number" step="0.01" value={tier.upper_bound} onChange={(event) => updateTier(index, 'upper_bound', event.target.value)} />
                  <Input label="Projected teacher contribution" type="number" step="0.01" value={tier.amount} onChange={(event) => updateTier(index, 'amount', event.target.value)} />
                  <Input label="Tier label" value={tier.label ?? ''} onChange={(event) => updateTier(index, 'label', event.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={saveDraft} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save draft'}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold theme-text">Policy versions</h2>
        <div className="mt-4 divide-y theme-border">
          {sortedPolicies.length === 0 ? (
            <p className="py-3 text-sm theme-muted">No revenue policy versions exist.</p>
          ) : sortedPolicies.map((policy) => (
            <div key={policy.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold theme-text">Version {policy.version} · {policy.status}</p>
                <p className="text-sm theme-muted">
                  Projected learner contribution: {money(policy.learner_contribution_amount, policy.currency)}
                </p>
                <p className="text-xs theme-subtle">
                  Tier boundaries: {policy.teacher_payout_tiers.map((tier) => `${tier.lower_bound}%–${tier.upper_bound}%`).join(', ')}
                </p>
              </div>
              <div className="flex gap-2">
                {canManage && policy.status === 'DRAFT' ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => loadDraft(policy.id)}>Edit draft</Button>
                    <Button size="sm" onClick={() => activate(policy.id)} disabled={saving}>Activate</Button>
                  </>
                ) : (
                  <span className="rounded-full px-2 py-1 text-xs font-medium theme-info-surface">
                    Immutable {policy.status.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
