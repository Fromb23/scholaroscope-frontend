'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Calendar, ChevronDown, ChevronRight, Users } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { SectionLoading } from '@/app/components/ui/loading';
import { buildReportReturnTo } from '@/app/core/components/reports/reportNavigation';
import {
  useSupervisionCohorts,
  useSupervisionSessions,
  useSupervisionSubjects,
} from '@/app/core/hooks/useSessionSupervisionHierarchy';
import type { SessionReadAuthorityMode } from '@/app/core/api/sessions';
import type { SupervisionSubjectSummary } from '@/app/core/types/session';

function parsePositive(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseSubjectKey(value: string | null) {
  const match = /^(kernel|cambridge):(\d+)$/.exec(value ?? '');
  if (!match) return null;
  const subjectId = Number(match[2]);
  return subjectId > 0
    ? { key: value as string, source: match[1] as 'kernel' | 'cambridge', subjectId }
    : null;
}

function subjectLabel(subject: SupervisionSubjectSummary): string {
  return subject.code ? `${subject.name} (${subject.code})` : subject.name;
}

export function SessionSupervisionHierarchy({
  workspaceId,
  termId,
  authorityMode,
  instructorId,
  sessionType,
}: {
  workspaceId: number;
  termId: number;
  authorityMode: SessionReadAuthorityMode;
  instructorId?: number;
  sessionType?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSubject = parseSubjectKey(searchParams.get('supervision_subject'));
  const requestedCohortId = parsePositive(searchParams.get('supervision_cohort'));
  const baseParams = useMemo(() => ({
    workspaceId,
    term: termId,
    authorityMode,
    instructorId,
    sessionType,
  }), [authorityMode, instructorId, sessionType, termId, workspaceId]);

  const subjectsQuery = useSupervisionSubjects(baseParams, true);
  const selectedSubject = useMemo(() => (
    requestedSubject
      ? subjectsQuery.data?.subjects.find((subject) => subject.key === requestedSubject.key) ?? null
      : null
  ), [requestedSubject, subjectsQuery.data?.subjects]);
  const cohortParams = useMemo(() => (
    selectedSubject
      ? {
          ...baseParams,
          subjectSource: selectedSubject.source,
          subjectId: selectedSubject.id,
        }
      : null
  ), [baseParams, selectedSubject]);
  const cohortsQuery = useSupervisionCohorts(cohortParams, Boolean(cohortParams));
  const selectedCohort = requestedCohortId
    ? cohortsQuery.data?.cohorts.find((cohort) => cohort.id === requestedCohortId) ?? null
    : null;
  const sessionParams = useMemo(() => (
    cohortParams && selectedCohort
      ? { ...cohortParams, cohortId: selectedCohort.id }
      : null
  ), [cohortParams, selectedCohort]);
  const sessionsQuery = useSupervisionSessions(sessionParams, Boolean(sessionParams));

  const replaceHierarchyState = useCallback((subjectKey: string | null, cohortId: number | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (subjectKey) next.set('supervision_subject', subjectKey);
    else next.delete('supervision_subject');
    if (cohortId) next.set('supervision_cohort', String(cohortId));
    else next.delete('supervision_cohort');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (subjectsQuery.loading || !requestedSubject) return;
    if (!selectedSubject) replaceHierarchyState(null, null);
  }, [replaceHierarchyState, requestedSubject, selectedSubject, subjectsQuery.loading]);

  useEffect(() => {
    if (cohortsQuery.loading || !requestedCohortId || !selectedSubject) return;
    if (!selectedCohort) replaceHierarchyState(selectedSubject.key, null);
  }, [cohortsQuery.loading, replaceHierarchyState, requestedCohortId, selectedCohort, selectedSubject]);

  if (subjectsQuery.error) {
    return <ErrorState message={subjectsQuery.error} onRetry={subjectsQuery.retry} />;
  }
  if (subjectsQuery.loading && !subjectsQuery.data) {
    return <SectionLoading title="Loading supervised subjects..." />;
  }
  const subjects = subjectsQuery.data?.subjects ?? [];
  if (subjects.length === 0) {
    return (
      <Card>
        <div className="py-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 theme-subtle" />
          <h2 className="mt-3 font-semibold theme-text">No supervised subjects in this term</h2>
          <p className="mt-1 text-sm theme-muted">Choose another term or adjust the supervision filters.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3" aria-label="Lesson supervision by subject and cohort">
      {subjects.map((subject) => {
        const subjectOpen = selectedSubject?.key === subject.key;
        const subjectPanelId = `supervision-subject-${subject.source}-${subject.id}`;
        return (
          <Card key={subject.key} className="overflow-hidden p-0">
            <button
              type="button"
              className="theme-focus-ring flex w-full items-center justify-between gap-4 p-4 text-left"
              aria-expanded={subjectOpen}
              aria-controls={subjectPanelId}
              onClick={() => replaceHierarchyState(subjectOpen ? null : subject.key, null)}
            >
              <span className="flex min-w-0 items-center gap-3">
                {subjectOpen
                  ? <ChevronDown className="h-5 w-5 shrink-0" />
                  : <ChevronRight className="h-5 w-5 shrink-0" />}
                <span className="min-w-0">
                  <span className="block truncate font-semibold theme-text">{subjectLabel(subject)}</span>
                  <span className="mt-1 block text-sm theme-muted">
                    {subject.cohort_count} cohort{subject.cohort_count === 1 ? '' : 's'}
                  </span>
                </span>
              </span>
              <Badge variant="blue">{subject.session_count} sessions</Badge>
            </button>

            {subjectOpen ? (
              <div id={subjectPanelId} className="border-t theme-border p-3 sm:p-4">
                {cohortsQuery.error ? (
                  <ErrorState message={cohortsQuery.error} onRetry={cohortsQuery.retry} />
                ) : cohortsQuery.loading && !cohortsQuery.data ? (
                  <SectionLoading title={`Loading ${subject.name} cohorts...`} />
                ) : (
                  <div className="space-y-3">
                    {(cohortsQuery.data?.cohorts ?? []).map((cohort) => {
                      const cohortOpen = selectedCohort?.id === cohort.id;
                      const cohortPanelId = `supervision-cohort-${subject.source}-${subject.id}-${cohort.id}`;
                      return (
                        <div key={cohort.id} className="rounded-lg border theme-border">
                          <button
                            type="button"
                            className="theme-focus-ring flex w-full items-center justify-between gap-3 p-3 text-left sm:p-4"
                            aria-expanded={cohortOpen}
                            aria-controls={cohortPanelId}
                            onClick={() => replaceHierarchyState(subject.key, cohortOpen ? null : cohort.id)}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              {cohortOpen
                                ? <ChevronDown className="h-4 w-4 shrink-0" />
                                : <ChevronRight className="h-4 w-4 shrink-0" />}
                              <span>
                                <span className="block font-medium theme-text">{cohort.name}</span>
                                <span className="mt-1 block text-xs theme-muted">{cohort.level}</span>
                              </span>
                            </span>
                            <span className="flex flex-wrap justify-end gap-2">
                              <Badge variant="default">{cohort.session_count} sessions</Badge>
                              <Badge variant="indigo">
                                {cohort.attendance_summary.percentage == null
                                  ? 'Attendance pending'
                                  : `${cohort.attendance_summary.percentage}% attendance`}
                              </Badge>
                            </span>
                          </button>

                          {cohortOpen ? (
                            <div id={cohortPanelId} className="border-t theme-border p-3 sm:p-4">
                              {sessionsQuery.error ? (
                                <ErrorState message={sessionsQuery.error} onRetry={sessionsQuery.retry} />
                              ) : sessionsQuery.loading ? (
                                <SectionLoading title={`Loading ${cohort.name} sessions...`} />
                              ) : sessionsQuery.data.length === 0 ? (
                                <p className="text-sm theme-muted">No sessions match this cohort and subject scope.</p>
                              ) : (
                                <div className="space-y-2">
                                  {sessionsQuery.data.map((session) => {
                                    const returnTo = buildReportReturnTo(pathname, searchParams.toString());
                                    const detailParams = new URLSearchParams({
                                      authority_mode: authorityMode,
                                      returnTo,
                                    });
                                    return (
                                      <div key={session.id} className="flex flex-col gap-3 rounded-lg border theme-border p-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                          <p className="truncate font-medium theme-text">{session.title || session.session_type_display}</p>
                                          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm theme-muted">
                                            <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />{session.session_date}</span>
                                            {session.created_by_name ? <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{session.created_by_name}</span> : null}
                                          </p>
                                        </div>
                                        <Link href={`/sessions/${session.id}?${detailParams.toString()}`}>
                                          <Button size="sm" variant="secondary">Open session</Button>
                                        </Link>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
