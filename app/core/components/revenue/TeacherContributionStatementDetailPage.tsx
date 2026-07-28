'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { LoadingMessage } from '@/app/components/ui/loading';
import { useTeacherContributionStatement } from '@/app/core/hooks/useInstitutionalRevenue';
import { blockersFrom, money, percent, revenueCapability } from './RevenueFormat';
import type { StatementReviewState } from '@/app/core/types/institutionalRevenue';

const REVIEW_STATES: StatementReviewState[] = ['PENDING', 'REVIEWED', 'FLAGGED'];

export function TeacherContributionStatementDetailPage({ statementId }: { statementId: string }) {
  const { capabilities } = useAuth();
  const { statement, loading, error, reviewStatement } = useTeacherContributionStatement(statementId);
  const [reviewState, setReviewState] = useState<StatementReviewState>('PENDING');
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const canReview = revenueCapability(capabilities, 'review');

  if (loading) return <LoadingMessage title="Loading teacher contribution statement..." />;

  if (error || !statement) {
    return <Card className="border border-red-200 bg-red-50 text-sm text-red-800">{error ?? 'Statement not found.'}</Card>;
  }

  const blockers = [
    ...blockersFrom(statement.assessment_compliance_result),
    ...blockersFrom(statement.calculation_details),
  ];

  const saveReview = async () => {
    setSaving(true);
    try {
      await reviewStatement(reviewState, reviewNote);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href={`/revenue/cycles/${statement.cycle}`} className="text-sm theme-link">Back to Revenue cycle</Link>
        <h1 className="mt-2 text-3xl font-semibold theme-text">{statement.teacher_name ?? `Teacher ${statement.teacher}`}</h1>
        <p className="mt-1 text-sm theme-muted">Teacher contribution statement from Calculation run {statement.calculation_run}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-xs uppercase theme-subtle">Eligible scheme entries</p><p className="mt-2 text-2xl font-semibold">{statement.eligible_scheme_entry_count}</p></Card>
        <Card><p className="text-xs uppercase theme-subtle">Verified entries</p><p className="mt-2 text-2xl font-semibold">{statement.verified_scheme_entry_count}</p></Card>
        <Card><p className="text-xs uppercase theme-subtle">Scheme implementation</p><p className="mt-2 text-2xl font-semibold">{percent(statement.scheme_implementation_ratio)}</p></Card>
        <Card><p className="text-xs uppercase theme-subtle">Projected teacher contribution</p><p className="mt-2 text-2xl font-semibold">{money(statement.projected_amount)}</p></Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold theme-text">Required assessment compliance</h2>
        <p className="mt-2 text-sm theme-muted">
          Result: {statement.assessment_compliance_result?.passed === true ? 'Passed' : 'Blocked'}
        </p>
        <div className="mt-3 space-y-2">
          {blockers.length === 0 ? (
            <p className="text-sm theme-muted">No blocking reasons returned.</p>
          ) : Array.from(new Map(blockers.map((blocker) => [blocker.code, blocker])).values()).map((blocker) => (
            <p key={blocker.code} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{blocker.message}</p>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold theme-text">Calculation evidence</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <p className="rounded-xl border theme-border p-3 text-sm">Active assignment count: {statement.active_assignment_count}</p>
          <p className="rounded-xl border theme-border p-3 text-sm">Projected tier: {statement.matched_policy_tier?.label ?? 'No tier'}</p>
        </div>
        <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
          {JSON.stringify({
            assignments: statement.calculation_details?.assignments,
            missing_required_assessment_components: statement.missing_required_assessment_components,
            calculation_details: statement.calculation_details,
          }, null, 2)}
        </pre>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold theme-text">Review</h2>
        <p className="mt-1 text-sm theme-muted">
          Reviewers may update review state and note only. Calculated counts, ratios, tiers and projected amounts are read-only.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Select
            label="Review state"
            value={reviewState}
            disabled={!canReview}
            onChange={(event) => setReviewState(event.target.value as StatementReviewState)}
            options={REVIEW_STATES.map((state) => ({ value: state, label: state }))}
          />
          <div>
            <label className="mb-1 block text-sm font-medium theme-text">Review note</label>
            <textarea
              value={reviewNote}
              disabled={!canReview}
              onChange={(event) => setReviewNote(event.target.value)}
              className="theme-input w-full rounded-lg px-4 py-2 text-sm"
              rows={4}
            />
          </div>
        </div>
        {canReview ? (
          <div className="mt-4 flex justify-end">
            <Button onClick={saveReview} disabled={saving}>{saving ? 'Saving...' : 'Save review'}</Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
