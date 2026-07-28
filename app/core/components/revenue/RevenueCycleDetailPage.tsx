'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle, PlayCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingMessage } from '@/app/components/ui/loading';
import { useRevenueCycleDetail } from '@/app/core/hooks/useInstitutionalRevenue';
import {
  blockersFrom,
  formatDateTime,
  money,
  percent,
  revenueCapability,
} from './RevenueFormat';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { RevenueCycleStatus, TeacherContributionStatement } from '@/app/core/types/institutionalRevenue';

function StatusAction({
  label,
  enabled,
  onClick,
}: {
  label: string;
  enabled: boolean;
  onClick: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setSaving(true);
    setError(null);
    try {
      await onClick();
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, `Unable to ${label.toLowerCase()}.`));
    } finally {
      setSaving(false);
    }
  };

  if (!enabled) return null;

  return (
    <span className="inline-flex flex-col gap-1">
      <Button size="sm" onClick={run} disabled={saving}>
        {saving ? 'Working...' : label}
      </Button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </span>
  );
}

function nextActions(status: RevenueCycleStatus) {
  return {
    canOpen: status === 'DRAFT',
    canCalculate: status === 'OPEN' || status === 'CALCULATED',
    canReview: status === 'CALCULATED',
    canApprove: status === 'UNDER_REVIEW',
    canClose: status === 'APPROVED',
  };
}

function rosterCount(
  roster: { totals: Array<{ inclusion_state: string; count: number }> } | null,
  state: 'INCLUDED' | 'EXCLUDED',
): number {
  return roster?.totals.find((item) => item.inclusion_state === state)?.count ?? 0;
}

function StatementRow({ statement }: { statement: TeacherContributionStatement }) {
  const compliancePassed = statement.assessment_compliance_result?.passed === true;

  return (
    <tr className="border-t theme-border">
      <td className="px-3 py-3">
        <Link className="font-medium theme-link" href={`/revenue/statements/${statement.id}`}>
          {statement.teacher_name ?? `Teacher ${statement.teacher}`}
        </Link>
      </td>
      <td className="px-3 py-3 text-right">{statement.active_assignment_count}</td>
      <td className="px-3 py-3 text-right">{statement.eligible_scheme_entry_count}</td>
      <td className="px-3 py-3 text-right">{statement.verified_scheme_entry_count}</td>
      <td className="px-3 py-3 text-right">{percent(statement.scheme_implementation_ratio)}</td>
      <td className="px-3 py-3">{compliancePassed ? 'Passed' : 'Blocked'}</td>
      <td className="px-3 py-3">{statement.matched_policy_tier?.label ?? 'No tier'}</td>
      <td className="px-3 py-3 text-right">{money(statement.projected_amount)}</td>
      <td className="px-3 py-3">{statement.review_state}</td>
    </tr>
  );
}

export function RevenueCycleDetailPage({ cycleId }: { cycleId: string }) {
  const { capabilities } = useAuth();
  const {
    cycle,
    roster,
    runs,
    statements,
    loading,
    error,
    openCycle,
    refreshRoster,
    runCalculation,
    markUnderReview,
    approveCycle,
    closeCycle,
  } = useRevenueCycleDetail(cycleId);
  const canManageCycles = revenueCapability(capabilities, 'cycles');
  const canCalculate = revenueCapability(capabilities, 'calculate');
  const canApprove = revenueCapability(capabilities, 'approve');

  if (loading) return <LoadingMessage title="Loading Revenue cycle..." />;

  if (error || !cycle) {
    return (
      <Card className="border border-red-200 bg-red-50 text-sm text-red-800">
        {error ?? 'Revenue cycle not found.'}
      </Card>
    );
  }

  const actions = nextActions(cycle.status);
  const blockers = [
    ...runs.flatMap((run) => blockersFrom(run.aggregate_projected_results)),
    ...statements.flatMap((statement) => blockersFrom(statement.assessment_compliance_result)),
  ];
  const projectedTotalTeacherContribution = statements.reduce((total, statement) => total + Number(statement.projected_amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium theme-subtle">Revenue cycle</p>
          <h1 className="text-3xl font-semibold theme-text">{cycle.term_name ?? `Term ${cycle.academic_term}`}</h1>
          <p className="mt-1 text-sm theme-muted">Status: {cycle.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusAction label="Open Revenue cycle" enabled={canManageCycles && actions.canOpen} onClick={openCycle} />
          <StatusAction label="Refresh roster projection" enabled={canManageCycles && cycle.status === 'OPEN'} onClick={refreshRoster} />
          <StatusAction label="Run Calculation run" enabled={canCalculate && actions.canCalculate} onClick={runCalculation} />
          <StatusAction label="Move under review" enabled={canManageCycles && actions.canReview} onClick={markUnderReview} />
          <StatusAction label="Approve Revenue cycle" enabled={canApprove && actions.canApprove} onClick={approveCycle} />
          <StatusAction label="Close Revenue cycle" enabled={canApprove && actions.canClose} onClick={closeCycle} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase theme-subtle">Projected learner contribution</p>
          <p className="mt-2 text-2xl font-semibold theme-text">{money(cycle.learner_contribution_amount_snapshot)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase theme-subtle">Eligible learner-seat count</p>
          <p className="mt-2 text-2xl font-semibold theme-text">{cycle.projected_eligible_learner_count}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase theme-subtle">Projected gross contribution</p>
          <p className="mt-2 text-2xl font-semibold theme-text">{money(cycle.projected_gross_contribution)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase theme-subtle">Projected teacher contribution</p>
          <p className="mt-2 text-2xl font-semibold theme-text">{money(projectedTotalTeacherContribution)}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold theme-text">Snapshotted policy</h2>
        <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
          {JSON.stringify(cycle.policy_snapshot, null, 2)}
        </pre>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold theme-text">Roster projection</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <p className="rounded-xl border theme-border p-3 text-sm">Included: {rosterCount(roster, 'INCLUDED') || cycle.projected_eligible_learner_count}</p>
          <p className="rounded-xl border theme-border p-3 text-sm">Excluded: {rosterCount(roster, 'EXCLUDED')}</p>
          <p className="rounded-xl border theme-border p-3 text-sm">Snapshot: {formatDateTime(cycle.roster_snapshot_at)}</p>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold theme-text">Blockers and warnings</h2>
        <div className="mt-3 space-y-2">
          {blockers.length === 0 ? (
            <p className="text-sm theme-muted">No blockers returned.</p>
          ) : Array.from(new Set(blockers)).map((blocker) => (
            <p key={blocker} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {blocker}
            </p>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 theme-subtle" />
          <h2 className="text-lg font-semibold theme-text">Calculation history</h2>
        </div>
        <div className="mt-3 divide-y theme-border">
          {runs.length === 0 ? (
            <p className="py-3 text-sm theme-muted">No Calculation run has been executed.</p>
          ) : runs.map((run) => (
            <div key={run.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span>
                <span className="block font-medium theme-text">Calculation run {run.run_number} · {run.status}</span>
                <span className="theme-muted">Formula {run.formula_version} · Completed {formatDateTime(run.completed_at)}</span>
              </span>
              <span>{money(run.aggregate_projected_results.projected_total_teacher_contribution)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 theme-subtle" />
          <h2 className="text-lg font-semibold theme-text">Teacher contribution statements</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="theme-muted">
              <tr>
                <th className="px-3 py-2">Teacher</th>
                <th className="px-3 py-2 text-right">Active assignment count</th>
                <th className="px-3 py-2 text-right">Eligible scheme entries</th>
                <th className="px-3 py-2 text-right">Verified entries</th>
                <th className="px-3 py-2 text-right">Scheme implementation</th>
                <th className="px-3 py-2">Required assessment compliance</th>
                <th className="px-3 py-2">Projected tier</th>
                <th className="px-3 py-2 text-right">Projected teacher contribution</th>
                <th className="px-3 py-2">Review state</th>
              </tr>
            </thead>
            <tbody>
              {statements.length === 0 ? (
                <tr><td className="px-3 py-4 theme-muted" colSpan={9}>No teacher contribution statements generated.</td></tr>
              ) : statements.map((statement) => <StatementRow key={statement.id} statement={statement} />)}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border border-slate-200 bg-slate-50">
        <div className="flex items-start gap-3 text-sm text-slate-700">
          <PlayCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            These values are projected only. This workflow has no financial-transfer actions.
          </p>
        </div>
      </Card>
    </div>
  );
}
