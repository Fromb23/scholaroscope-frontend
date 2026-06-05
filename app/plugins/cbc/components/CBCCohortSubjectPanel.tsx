'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Lock, X } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { cohortAPI } from '@/app/core/api/academic';
import type { CohortDetail } from '@/app/core/types/academic';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { CohortSubjectPanelContext } from '@/app/core/registry/cohortSubjectPanels';
import { cbcPathwayAPI } from '@/app/plugins/cbc/api/pathways';
import type { CbcAllowedSubject, CbcCohortAllowedSubjects } from '@/app/plugins/cbc/types/pathways';

function SubjectRow({
  subject,
  linked,
  readOnly,
  actionLabel,
  actionDisabled,
  actionTitle,
  tone,
  onAction,
  meta,
}: {
  subject: CbcAllowedSubject;
  linked: boolean;
  readOnly: boolean;
  actionLabel?: string;
  actionDisabled?: boolean;
  actionTitle?: string;
  tone: 'core' | 'pathway' | 'blocked';
  onAction?: () => void;
  meta?: string;
}) {
  const toneClasses = {
    core: 'bg-blue-50 border-blue-100',
    pathway: 'bg-green-50 border-green-100',
    blocked: 'bg-gray-50 border-gray-200',
  };

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${toneClasses[tone]}`}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{subject.subject_name}</span>
          <span className="font-mono text-xs text-gray-500">{subject.subject_code}</span>
          {linked ? <Badge variant="default" size="sm">Linked</Badge> : null}
          {subject.locked ? (
            <Badge variant="info" size="sm">
              <Lock className="mr-1 h-3 w-3" />
              Locked
            </Badge>
          ) : null}
        </div>
        {meta ? <p className="text-xs text-gray-500">{meta}</p> : null}
      </div>

      {!readOnly && actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          title={actionTitle}
          className="rounded px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function CBCCohortSubjectPanel({
  cohortId,
  isHistorical,
  onSubjectsChanged,
}: CohortSubjectPanelContext) {
  const [snapshot, setSnapshot] = useState<CbcCohortAllowedSubjects | null>(null);
  const [detail, setDetail] = useState<CohortDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allowed, cohortDetail] = await Promise.all([
        cbcPathwayAPI.getCohortAllowedSubjects(cohortId),
        cohortAPI.getById(cohortId),
      ]);
      setSnapshot(allowed);
      setDetail(cohortDetail);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to load CBC subject options.'));
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => {
    void load();
  }, [load]);

  const linkedSubjectIds = useMemo(
    () => new Set((detail?.subjects ?? []).map((subject) => subject.subject_id ?? subject.subject)),
    [detail]
  );

  const handleLink = async (subjectId: number | null) => {
    if (!subjectId) return;
    setWorking(true);
    setError(null);
    try {
      await cohortAPI.assignSubject(cohortId, subjectId, true);
      await load();
      await onSubjectsChanged?.();
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to link subject.'));
    } finally {
      setWorking(false);
    }
  };

  const handleUnlink = async (subjectId: number | null) => {
    if (!subjectId) return;
    setWorking(true);
    setError(null);
    try {
      await cohortAPI.removeSubject(cohortId, subjectId);
      await load();
      await onSubjectsChanged?.();
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to unlink subject.'));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const profileSummary = snapshot.combination
    ? `${snapshot.pathway?.name} · ${snapshot.track?.name} · Combination ${snapshot.combination.official_code}`
    : 'No CBC pathway combination configured yet.';

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">CBC Senior School</Badge>
          {snapshot.combination ? <Badge variant="default">Configured</Badge> : <Badge variant="warning">Needs profile</Badge>}
        </div>
        <p className="mt-2 text-sm font-medium text-gray-900">{profileSummary}</p>
        {!snapshot.combination ? (
          <p className="mt-1 text-xs text-gray-600">
            Configure the cohort pathway, track, and official subject combination first. Core subjects remain global and locked.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-blue-600" />
          <p className="text-sm font-semibold text-gray-700">Core Subjects</p>
          <Badge variant="info" size="sm">{snapshot.core.length}</Badge>
        </div>
        {snapshot.core.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
            No core subjects are registered for this grade level yet.
          </p>
        ) : (
          <div className="space-y-2">
            {snapshot.core.map((subject) => (
              <SubjectRow
                key={`core:${subject.subject_name}:${subject.subject_code}`}
                subject={subject}
                linked={subject.subject_id !== null && linkedSubjectIds.has(subject.subject_id)}
                readOnly={isHistorical}
                tone="core"
                meta="Core — global curriculum requirement"
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <p className="text-sm font-semibold text-gray-700">Pathway Subjects</p>
          <Badge variant="default" size="sm">{snapshot.pathway_subjects.length}</Badge>
        </div>
        {snapshot.pathway_subjects.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
            No pathway subjects are available until a cohort subject combination is configured.
          </p>
        ) : (
          <div className="space-y-2">
            {snapshot.pathway_subjects.map((subject) => {
              const linked = subject.subject_id !== null && linkedSubjectIds.has(subject.subject_id);
              return (
                <SubjectRow
                  key={`pathway:${subject.subject_name}:${subject.subject_code}`}
                  subject={subject}
                  linked={linked}
                  readOnly={isHistorical}
                  tone="pathway"
                  meta="Official subject combination"
                  actionLabel={linked ? 'Remove' : 'Link'}
                  actionDisabled={working || subject.subject_id === null}
                  actionTitle={subject.subject_id === null ? 'Subject mirror is not available yet.' : undefined}
                  onAction={() => (linked ? handleUnlink(subject.subject_id) : handleLink(subject.subject_id))}
                />
              );
            })}
          </div>
        )}
      </div>

      {snapshot.blocked.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-gray-700">Blocked Subjects</p>
            <Badge variant="warning" size="sm">{snapshot.blocked.length}</Badge>
          </div>
          <div className="space-y-2">
            {snapshot.blocked.map((subject) => (
              <div
                key={`blocked:${subject.subject_name}:${subject.subject_code}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{subject.subject_name}</span>
                    <span className="font-mono text-xs text-gray-500">{subject.subject_code}</span>
                  </div>
                  <p className="text-xs text-gray-500">{subject.reason}</p>
                </div>
                <X className="h-4 w-4 shrink-0 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isHistorical ? (
        <p className="text-center text-xs text-gray-400">
          This cohort is historical and its subject offering is read-only.
        </p>
      ) : null}
    </div>
  );
}
