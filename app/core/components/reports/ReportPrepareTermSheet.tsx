'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader, SlidersHorizontal, Wrench } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { ActionStateBanner, ResponsiveActionSheet } from '@/app/components/ui/actions';
import { reportsAPI } from '@/app/core/api/reporting';
import { resolveReportError } from '@/app/core/errors';
import type {
  ReportComputeReadiness,
  ReportReadinessRecommendation,
  ReportReadinessRow,
} from '@/app/core/types/reporting';

type PrepareStatus = 'idle' | 'loading' | 'warning' | 'success' | 'error' | 'blocked';

interface ReportPrepareTermSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termId: number | null;
  readiness: ReportComputeReadiness | null;
  onReadinessChange: (readiness: ReportComputeReadiness) => void;
  managePoliciesHref: string;
  autoPrepareKey?: number;
  onAfterMutation?: () => Promise<unknown> | unknown;
}

function rowLabel(row: ReportReadinessRow): string {
  return row.label
    ?? [row.cohort?.name, row.subject?.code ?? row.subject?.name].filter(Boolean).join(' - ')
    ?? row.message
    ?? 'Policy setup item';
}

function decisionLabel(item: Record<string, unknown>): string {
  const label = item.label ?? item.message ?? item.name ?? item.reason;
  return typeof label === 'string' ? label : 'Decision needed before reports are ready.';
}

function hasOutstandingSetup(readiness: ReportComputeReadiness | null): boolean {
  if (!readiness) return false;
  return Boolean(
    !(readiness.can_compute ?? readiness.ready)
    || readiness.recommendations?.length
    || readiness.conflicts?.length
    || readiness.missing?.length
    || readiness.decision_items?.length,
  );
}

function successMessage(result: ReportComputeReadiness): string {
  if (result.applied) {
    return `${result.applied.policy.name} applied. ${(result.can_compute ?? result.ready) ? 'Reports are ready to compute.' : 'Review the remaining policy setup items.'}`;
  }
  if (result.prepared && (result.can_compute ?? result.ready)) {
    return 'Preparation complete. Reports are ready to compute.';
  }
  return result.message ?? 'Preparation complete. Review recommendations and setup items before computing reports.';
}

export function ReportPrepareTermSheet({
  open,
  onOpenChange,
  termId,
  readiness,
  onReadinessChange,
  managePoliciesHref,
  autoPrepareKey,
  onAfterMutation,
}: ReportPrepareTermSheetProps) {
  const [status, setStatus] = useState<PrepareStatus>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [applyingRecommendation, setApplyingRecommendation] = useState<string | null>(null);
  const lastAutoPrepareKey = useRef<number | undefined>(undefined);

  const safeRecommendations = useMemo(
    () => readiness?.recommendations?.filter((recommendation) => recommendation.safe_to_apply) ?? [],
    [readiness?.recommendations],
  );
  const decisionItems = readiness?.decision_items ?? [];
  const conflicts = readiness?.conflicts ?? [];
  const missing = readiness?.missing ?? [];

  const handlePrepare = useCallback(async () => {
    if (!termId) {
      setStatus('blocked');
      setActionError('Select a term before preparing report setup.');
      return;
    }

    setStatus('loading');
    setActionError(null);
    setActionMessage('Scanning report policy coverage and preparing safe recommendations.');
    try {
      const result = await reportsAPI.prepareTermForReports(termId);
      onReadinessChange(result);
      await onAfterMutation?.();
      setStatus(hasOutstandingSetup(result) ? 'warning' : 'success');
      setActionMessage(successMessage(result));
    } catch (error) {
      const resolved = resolveReportError(error, {
        action: 'load',
        entityLabel: 'report setup recommendations',
        role: 'ADMIN',
      });
      setStatus('error');
      setActionError(resolved.message ?? 'Could not prepare this term for reports.');
      setActionMessage(null);
    }
  }, [onAfterMutation, onReadinessChange, termId]);

  const handleApplyRecommendation = async (recommendation: ReportReadinessRecommendation) => {
    if (!termId) return;

    setStatus('loading');
    setApplyingRecommendation(recommendation.id);
    setActionError(null);
    setActionMessage(`Applying recommended fix: ${recommendation.label}`);
    try {
      const result = await reportsAPI.applyRecommendedFix(termId, recommendation.id);
      onReadinessChange(result);
      await onAfterMutation?.();
      setStatus(hasOutstandingSetup(result) ? 'warning' : 'success');
      setActionMessage(successMessage(result));
    } catch (error) {
      const resolved = resolveReportError(error, {
        action: 'update',
        entityLabel: 'recommended report setup fix',
        role: 'ADMIN',
      });
      setStatus('error');
      setActionError(resolved.message ?? 'Could not apply the recommended report setup fix.');
      setActionMessage(null);
    } finally {
      setApplyingRecommendation(null);
    }
  };

  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setActionError(null);
      setActionMessage(null);
      setApplyingRecommendation(null);
      return;
    }

    if (!autoPrepareKey || lastAutoPrepareKey.current === autoPrepareKey) return;
    lastAutoPrepareKey.current = autoPrepareKey;
    void handlePrepare();
  }, [autoPrepareKey, handlePrepare, open]);

  const busy = status === 'loading';
  const sheetState = status === 'idle' ? 'warning' : status;

  return (
    <ResponsiveActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Prepare Term for Reports"
      description="Setup progress, recommendations, conflicts, and apply results stay in this action."
      size="lg"
      state={sheetState}
      closeDisabled={busy}
      preventBackdropClose
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Close
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Link href={managePoliciesHref}>
              <Button type="button" variant="secondary" disabled={busy} className="w-full sm:w-auto">
                Manage Report Policies
              </Button>
            </Link>
            <Button type="button" onClick={handlePrepare} disabled={!termId || busy} className="w-full sm:w-auto">
              {busy && !applyingRecommendation ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Preparing
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4" />
                  Run Preparation
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {!termId ? (
          <ActionStateBanner
            variant="blocked"
            title="Term required"
            message="Select a term before preparing report setup."
          />
        ) : null}

        {status === 'loading' ? (
          <ActionStateBanner
            variant="loading"
            title={applyingRecommendation ? 'Applying recommendation' : 'Preparing term'}
            message={actionMessage ?? 'Checking policy coverage and report readiness.'}
          />
        ) : null}

        {status === 'error' && actionError ? (
          <ActionStateBanner
            variant="error"
            title="Preparation failed"
            message={actionError}
            action={
              <Button type="button" size="sm" onClick={handlePrepare}>
                Retry Preparation
              </Button>
            }
          />
        ) : null}

        {(status === 'success' || status === 'warning') && actionMessage ? (
          <ActionStateBanner
            variant={status === 'success' ? 'success' : 'warning'}
            title={status === 'success' ? 'Preparation complete' : 'Review setup items'}
            message={actionMessage}
          />
        ) : null}

        {safeRecommendations.length > 0 ? (
          <section className="space-y-3">
            <div>
              <h3 className="font-semibold theme-text">Recommendations</h3>
              <p className="mt-1 text-sm theme-muted">
                Apply safe fixes here so progress and errors stay attached to this action.
              </p>
            </div>
            {safeRecommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-lg border theme-border p-4">
                <div className="flex items-start gap-3">
                  <SlidersHorizontal className="mt-1 h-5 w-5 shrink-0 text-[color:var(--color-info)]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium theme-text">{recommendation.label}</p>
                    <p className="mt-1 text-sm theme-muted">
                      {recommendation.summary
                        ?? `Covers ${recommendation.affected_class_subject_count} class subjects and ${recommendation.affected_result_estimate} learner-subject reports.`}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3"
                      onClick={() => void handleApplyRecommendation(recommendation)}
                      disabled={busy}
                    >
                      {applyingRecommendation === recommendation.id ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Applying
                        </>
                      ) : 'Apply Recommended Fix'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {decisionItems.length > 0 ? (
          <ActionStateBanner
            variant="warning"
            title="Decision needed"
            message={
              <ul className="list-disc space-y-1 pl-4">
                {decisionItems.slice(0, 4).map((item, index) => (
                  <li key={index}>{decisionLabel(item)}</li>
                ))}
              </ul>
            }
          />
        ) : null}

        {conflicts.length > 0 ? (
          <ActionStateBanner
            variant="blocked"
            title="Policy conflicts"
            message={
              <ul className="list-disc space-y-1 pl-4">
                {conflicts.slice(0, 4).map((row, index) => (
                  <li key={index}>{rowLabel(row)}</li>
                ))}
              </ul>
            }
          />
        ) : null}

        {missing.length > 0 ? (
          <ActionStateBanner
            variant="warning"
            title="Missing policy coverage"
            message={`${missing.length} class subject${missing.length === 1 ? '' : 's'} still need report policy coverage.`}
          />
        ) : null}

        {readiness && !hasOutstandingSetup(readiness) && status === 'idle' ? (
          <ActionStateBanner
            variant="success"
            title="Reports are ready"
            message="This term already has the policy coverage required for official report computation."
          />
        ) : null}

        {!readiness && status === 'idle' && termId ? (
          <ActionStateBanner
            variant="info"
            title="Ready to scan"
            message="Run preparation to scan policy coverage and create safe recommendations."
          />
        ) : null}
      </div>
    </ResponsiveActionSheet>
  );
}
