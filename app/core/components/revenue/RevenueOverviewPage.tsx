'use client';

import Link from 'next/link';
import { AlertCircle, Calculator, FileText, Settings } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingMessage } from '@/app/components/ui/loading';
import { institutionalRevenueAPI } from '@/app/core/api/institutionalRevenue';
import { useInstitutionalRevenueOverview } from '@/app/core/hooks/useInstitutionalRevenue';
import { formatDateTime, money, revenueCapability } from './RevenueFormat';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import { useState } from 'react';

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border theme-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide theme-subtle">{label}</p>
      <p className="mt-2 text-2xl font-semibold theme-text">{value}</p>
    </div>
  );
}

export function RevenueOverviewPage() {
  const { capabilities } = useAuth();
  const { overview, cycles, policies, loading, error, refetch } = useInstitutionalRevenueOverview();
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const canManageCycles = revenueCapability(capabilities, 'cycles');
  const canManagePolicy = revenueCapability(capabilities, 'policy');
  const activePolicy = policies.find((policy) => policy.status === 'ACTIVE') ?? null;
  const activeCycle = overview?.active_revenue_cycle ?? null;
  const currentTerm = overview?.current_term ?? null;
  const blockerMessages = (
    overview?.compliance_blocker_summary?.length
      ? overview.compliance_blocker_summary
      : overview?.blockers ?? []
  ).map((blocker) => blocker.message);
  const balance = overview?.projected_balance_summary ?? activeCycle?.projected_balance_summary ?? null;

  const createCurrentCycle = async () => {
    if (!currentTerm?.id) return;
    setCreating(true);
    setActionError(null);
    try {
      await institutionalRevenueAPI.createCycle(currentTerm.id);
      await refetch();
    } catch (err) {
      setActionError(resolveErrorMessage(err as ApiError, 'Unable to create revenue cycle.'));
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingMessage title="Loading revenue cycle data..." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium theme-subtle">Projection and governance infrastructure</p>
          <h1 className="text-3xl font-semibold theme-text">Revenue cycle</h1>
          <p className="mt-1 text-sm theme-muted">
            Learner-funded term projections and teacher implementation-contribution statements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManagePolicy ? (
            <Link href="/revenue/policies">
              <Button variant="secondary"><Settings className="h-4 w-4" /> Policies</Button>
            </Link>
          ) : null}
          {canManageCycles && currentTerm && !activeCycle ? (
            <Button onClick={createCurrentCycle} disabled={creating}>
              <Calculator className="h-4 w-4" />
              {creating ? 'Creating...' : 'Create current Revenue cycle'}
            </Button>
          ) : null}
        </div>
      </div>

      {(error || actionError) ? (
        <Card className="border border-red-200 bg-red-50 text-sm text-red-800">
          {error ?? actionError}
        </Card>
      ) : null}

      {!activePolicy ? (
        <Card className="border border-amber-200 bg-amber-50">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <h2 className="font-semibold text-amber-950">No active policy</h2>
              <p className="mt-1 text-sm text-amber-800">
                Create and activate a revenue policy before opening a Revenue cycle.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Cycle status" value={activeCycle?.status ?? 'No active Revenue cycle'} />
        <Metric label="Projected learner contribution" value={money(overview?.projected_learner_contribution ?? activePolicy?.learner_contribution_amount, activePolicy?.currency ?? 'KES')} />
        <Metric label="Eligible learner-seat count" value={overview?.eligible_learner_seat_count ?? activeCycle?.projected_eligible_learner_count ?? 0} />
        <Metric label="Projected gross contribution" value={money(overview?.projected_gross_contribution ?? activeCycle?.projected_gross_contribution, activePolicy?.currency ?? 'KES')} />
        <Metric label="Eligible teacher count" value={overview?.eligible_teacher_count ?? 0} />
        <Metric label="Projected teacher contribution" value={money(overview?.projected_total_teacher_contribution, activePolicy?.currency ?? 'KES')} />
        <Metric label="Projected balance" value={money(balance?.projected_balance, activePolicy?.currency ?? 'KES')} />
        <Metric label="Calculation run" value={formatDateTime(overview?.latest_calculation_timestamp)} />
        <Metric label="Current term" value={currentTerm?.name ?? 'No current term'} />
      </div>

      {overview?.overview_state === 'NO_CURRENT_TERM' ? (
        <Card className="border border-amber-200 bg-amber-50 text-sm text-amber-900">
          No current academic term is active for this institution.
        </Card>
      ) : null}
      {overview?.overview_state === 'CURRENT_TERM_WITHOUT_CYCLE' ? (
        <Card className="border border-amber-200 bg-amber-50 text-sm text-amber-900">
          The current term does not have a revenue cycle.
        </Card>
      ) : null}
      {balance?.state === 'DEFICIT' ? (
        <Card className="border border-amber-300 bg-amber-50 text-sm text-amber-900">
          Projected deficit: teacher projections exceed projected learner contribution.
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold theme-text">Compliance/blocker summary</h2>
            <p className="text-sm theme-muted">Backend-calculated blockers for the latest projection.</p>
          </div>
          {activeCycle ? (
            <Link href={`/revenue/cycles/${activeCycle.id}`}>
              <Button variant="secondary" size="sm"><FileText className="h-4 w-4" /> Open detail</Button>
            </Link>
          ) : null}
        </div>
        <div className="mt-4 space-y-2">
          {blockerMessages.length === 0 ? (
            <p className="text-sm theme-muted">No blockers returned for the latest Calculation run.</p>
          ) : blockerMessages.map((blocker) => (
            <p key={blocker} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {blocker}
            </p>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold theme-text">Recent Revenue cycles</h2>
        <div className="mt-4 divide-y theme-border">
          {cycles.length === 0 ? (
            <p className="py-3 text-sm theme-muted">No Revenue cycle has been created yet.</p>
          ) : cycles.map((cycle) => (
            <Link key={cycle.id} href={`/revenue/cycles/${cycle.id}`} className="flex items-center justify-between gap-4 py-3">
              <span>
                <span className="block font-medium theme-text">{cycle.term_name ?? `Term ${cycle.academic_term}`}</span>
                <span className="text-sm theme-muted">Projected gross contribution: {money(cycle.projected_gross_contribution)}</span>
              </span>
              <span className="rounded-full px-2 py-1 text-xs font-medium theme-info-surface">{cycle.status}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
