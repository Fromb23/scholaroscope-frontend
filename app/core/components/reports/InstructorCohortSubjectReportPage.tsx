'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  FileBarChart,
  ListChecks,
  Users,
} from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { ClassSubjectAssignmentParticipation } from './ClassSubjectAssignmentParticipation';
import { ReportPageShell } from './ReportLayouts';
import {
  buildAttendanceReportHref,
  buildCanonicalLearnerSubjectReportHref,
  buildCbcCohortProgressHref,
  buildReportReturnTo,
  getReportBackLabel,
  resolveReportBackHref,
} from './reportNavigation';
import { applyReportStateChange, parseReportIntent, reportAuthorityModeForOperatingContext, type ReportProjection } from './reportIntent';
import { useAuth } from '@/app/context/AuthContext';
import { useCohortSubjectReportTerms } from '@/app/core/hooks/useReporting';
import {
  useCanonicalCohortSubjectLearners,
  useCanonicalCohortSubjectOverview,
  useCanonicalCohortSubjectPerformance,
  useCanonicalCohortSubjectTeachingActivity,
} from '@/app/core/hooks/reports/useCanonicalCohortSubjectReport';
import { formatPercent } from '@/app/core/lib/reportingPresentation';
import { getReturnBackLabel } from '@/app/core/lib/workspaceReturn';

const PROJECTIONS: Array<{ id: ReportProjection; label: string; icon: typeof FileBarChart }> = [
  { id: 'overview', label: 'Overview', icon: FileBarChart },
  { id: 'learners', label: 'Learners', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'assessments-results', label: 'Assessments & Results', icon: ListChecks },
  { id: 'assignments', label: 'Assignments', icon: BookOpen },
  { id: 'curriculum-progress', label: 'Curriculum Progress', icon: Activity },
];

function recordNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function EmptyProjection({ children }: { children: string }) {
  return <Card><p className="text-sm theme-muted">{children}</p></Card>;
}

export default function CanonicalCohortSubjectReportPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOperatingContext } = useAuth();
  const cohortSubjectId = Number(params.id);
  const validId = Number.isInteger(cohortSubjectId) && cohortSubjectId > 0;
  const authorityMode = reportAuthorityModeForOperatingContext(activeOperatingContext);
  const intent = useMemo(
    () => parseReportIntent(
      { type: 'cohort-subject', cohortSubjectId: validId ? cohortSubjectId : 1 },
      new URLSearchParams(searchParams.toString()),
    ),
    [cohortSubjectId, searchParams, validId],
  );
  const projection = intent.projection;
  const selectedTermId = intent.period?.termId ?? null;
  const { terms, currentTermId, loading: termsLoading, error: termsError } = useCohortSubjectReportTerms(
    validId ? cohortSubjectId : null,
    { authorityMode },
  );
  const allowedTermIds = useMemo(() => new Set(terms.map((term) => term.id)), [terms]);
  const effectiveTermId = selectedTermId && allowedTermIds.has(selectedTermId)
    ? selectedTermId
    : currentTermId ?? terms[0]?.id ?? null;
  const effectiveTerm = terms.find((term) => term.id === effectiveTermId) ?? null;

  const updateState = useCallback((updates: { projection?: ReportProjection; term?: number | null }, replace = false) => {
    let next = new URLSearchParams(searchParams.toString());
    next.delete('tab');
    if (updates.projection) next = applyReportStateChange(next, 'projection', updates.projection);
    if (updates.term !== undefined) {
      next = applyReportStateChange(next, 'term', updates.term ?? null);
    }
    const destination = `${pathname}${next.toString() ? `?${next.toString()}` : ''}`;
    if (replace) router.replace(destination, { scroll: false });
    else router.push(destination, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (termsLoading || termsError) return;
    const needsProjection = !searchParams.get('projection') || searchParams.has('tab');
    const needsTerm = effectiveTermId !== selectedTermId;
    if (needsProjection || needsTerm) {
      updateState({ projection, term: effectiveTermId }, true);
    }
  }, [effectiveTermId, projection, searchParams, selectedTermId, termsError, termsLoading, updateState]);

  const overviewQuery = useCanonicalCohortSubjectOverview(
    cohortSubjectId,
    effectiveTermId,
    authorityMode,
    validId && (projection === 'overview' || projection === 'assignments'),
  );
  const learnersQuery = useCanonicalCohortSubjectLearners(
    cohortSubjectId,
    effectiveTermId,
    authorityMode,
    validId && projection === 'learners',
  );
  const performanceQuery = useCanonicalCohortSubjectPerformance(
    cohortSubjectId,
    effectiveTermId,
    authorityMode,
    validId && (projection === 'overview' || projection === 'assessments-results'),
  );
  const activityQuery = useCanonicalCohortSubjectTeachingActivity(
    cohortSubjectId,
    effectiveTermId,
    authorityMode,
    validId && (projection === 'overview' || projection === 'attendance' || projection === 'curriculum-progress'),
  );

  const overview = overviewQuery.data;
  const learners = learnersQuery.data?.learners ?? [];
  const performance = performanceQuery.data;
  const activity = activityQuery.data;
  const meta = overview
    ? {
        cohortName: overview.cohort.name,
        subjectName: overview.subject.name,
        subjectId: overview.subject.id,
        cohortId: overview.cohort.id,
        reportingSource: overview.reporting_source,
        curriculumType: overview.curriculum_type,
      }
    : performance?.cohort_subject
      ? {
          cohortName: performance.cohort_subject.cohort_name ?? 'Class',
          subjectName: performance.cohort_subject.subject_name,
          subjectId: performance.cohort_subject.subject_id,
          cohortId: performance.cohort_subject.cohort_id,
          reportingSource: performance.reporting_source,
          curriculumType: performance.curriculum_type,
        }
      : null;
  const currentReturnTo = buildReportReturnTo(pathname, searchParams.toString());
  const structuralFallback = meta
    ? `/reports/subjects/${meta.subjectId}?term=${effectiveTermId ?? ''}`.replace(/\?term=$/, '')
    : '/reports/cohorts';
  const backHref = resolveReportBackHref({
    returnTo: searchParams.get('returnTo'),
    fallbackHref: structuralFallback,
  });
  const backLabel = getReturnBackLabel(backHref, getReportBackLabel(backHref));
  const activeError = overviewQuery.error ?? learnersQuery.error ?? performanceQuery.error ?? activityQuery.error ?? termsError;
  const activeLoading = termsLoading
    || overviewQuery.loading
    || learnersQuery.loading
    || performanceQuery.loading
    || activityQuery.loading;

  if (!validId) return <ErrorState fullScreen={false} message="This class subject could not be found." />;

  return (
    <ReportPageShell>
      <div className="space-y-3">
        <Link href={backHref}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />{backLabel}</Button>
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold theme-text">
              {meta ? `${meta.cohortName} — ${meta.subjectName}` : `Class Subject #${cohortSubjectId}`}
            </h1>
            <p className="mt-1 text-sm theme-muted">
              One term-scoped report object for participation, results, teaching activity, and curriculum progress.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={authorityMode === 'supervision' ? 'purple' : 'blue'}>
                {authorityMode === 'supervision' ? 'Supervision' : 'My teaching'}
              </Badge>
              {meta?.curriculumType ? <Badge variant="default">{meta.curriculumType}</Badge> : null}
              {meta?.reportingSource ? <Badge variant="default">{meta.reportingSource}</Badge> : null}
              {effectiveTerm ? <Badge variant="default">{effectiveTerm.academic_year_name} — {effectiveTerm.name}</Badge> : null}
              <Badge variant={overview?.instructor ? 'blue' : 'warning'}>
                {overview?.instructor?.name ?? 'Instructor not assigned'}
              </Badge>
            </div>
          </div>
          <div className="w-full sm:w-72">
            <Select
              label="Term"
              value={effectiveTermId?.toString() ?? ''}
              onChange={(event) => updateState({ term: event.target.value ? Number(event.target.value) : null })}
              disabled={termsLoading || terms.length === 0}
              options={terms.length > 0
                ? terms.map((term) => ({ value: String(term.id), label: `${term.academic_year_name} — ${term.name}` }))
                : [{ value: '', label: termsLoading ? 'Loading terms…' : 'No term configured' }]}
            />
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Class subject report projections">
        {PROJECTIONS.map((item) => {
          const Icon = item.icon;
          const active = projection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => updateState({ projection: item.id })}
              aria-current={active ? 'page' : undefined}
              className={`theme-focus-ring inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${active ? 'border-blue-600 bg-blue-600 text-white' : 'theme-border theme-surface theme-text'}`}
            >
              <Icon className="h-4 w-4" />{item.label}
            </button>
          );
        })}
      </nav>

      {activeLoading ? <LoadingSpinner message={`Loading ${projection.replace(/-/g, ' ')}…`} /> : null}
      {!activeLoading && activeError ? (
        <ErrorState fullScreen={false} message={activeError} />
      ) : null}

      {!activeLoading && !activeError && projection === 'overview' && overview ? (
        <div className="space-y-5">
          <StatStrip mdColumns={2} xlColumns={4}>
            <StatsCard title="Learners" value={overview.learner_count} icon={Users} color="blue" />
            <StatsCard title="Sessions conducted" value={activity?.sessions_completed ?? '—'} icon={Activity} color="green" />
            <StatsCard title="Attendance rate" value={formatPercent(overview.attendance_trend.attendance_rate)} icon={ClipboardCheck} color="indigo" />
            <StatsCard title="Attendance complete" value={formatPercent(activity?.attendance_completeness)} icon={ClipboardCheck} color="purple" />
            <StatsCard title="Assessments" value={performance?.assessment_completion?.total_assessments ?? 0} icon={ListChecks} color="blue" />
            <StatsCard title="Class average" value={formatPercent(performance?.generic_performance?.average_score ?? performance?.cbc_performance?.average_weighted_score)} icon={FileBarChart} color="green" />
            <StatsCard title="Assignments issued" value={overview.assignment_summary.assignments_total} icon={BookOpen} color="purple" />
            <StatsCard title="Assignment participation" value={formatPercent(overview.assignment_summary.assignment_completion_rate)} icon={BookOpen} color="indigo" />
            <StatsCard title="Curriculum coverage" value={formatPercent(overview.progress.coverage_percentage)} icon={Activity} color="green" />
            <StatsCard title="Evidence records" value={overview.progress.evidence_count} icon={ClipboardCheck} color="blue" />
            <StatsCard title="Learners needing support" value={overview.learners_needing_support.length} icon={Users} color="orange" />
          </StatStrip>
          <Card>
            <h2 className="font-semibold theme-text">Report status</h2>
            <p className="mt-2 text-sm theme-muted">{overview.class_response_summary || 'No class response summary is available yet.'}</p>
            <p className="mt-2 text-sm theme-subtle">
              {performance?.note || (meta?.reportingSource === 'cbc'
                ? 'CBC progress and results are presented from CBC-owned projections and freshness rules.'
                : 'Results use the configured server-owned grading and finalization rules.')}
            </p>
          </Card>
        </div>
      ) : null}

      {!activeLoading && !activeError && projection === 'learners' ? (
        learners.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {learners.map((row) => (
              <Card key={row.student.id}>
                <h2 className="font-semibold theme-text">{row.student.name}</h2>
                <p className="mt-1 text-sm theme-subtle">{row.student.admission_number}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="default">{row.status ?? 'reportable'}</Badge>
                  <Badge variant="blue">{formatPercent(row.attendance_summary?.average)}</Badge>
                </div>
                <Link href={buildCanonicalLearnerSubjectReportHref(
                  row.student.id,
                  cohortSubjectId,
                  'overview',
                  { term: effectiveTermId, authorityMode, returnTo: currentReturnTo, originKind: 'hierarchy' },
                )}>
                  <Button variant="secondary" size="sm" className="mt-4">Open learner report</Button>
                </Link>
              </Card>
            ))}
          </div>
        ) : <EmptyProjection>No learners are available in this reporting scope.</EmptyProjection>
      ) : null}

      {!activeLoading && !activeError && projection === 'attendance' && activity ? (
        <div className="space-y-4">
          <StatStrip mdColumns={2} xlColumns={4}>
            <StatsCard title="Sessions" value={activity.sessions_created} icon={Activity} color="blue" />
            <StatsCard title="Completed sessions" value={activity.sessions_completed} icon={Activity} color="green" />
            <StatsCard title="Observations marked" value={activity.attendance_marked} icon={ClipboardCheck} color="purple" />
            <StatsCard title="Completion" value={formatPercent(activity.attendance_completeness)} icon={ClipboardCheck} color="indigo" />
          </StatStrip>
          {meta ? (
            <Link href={buildAttendanceReportHref({
              term: effectiveTermId,
              cohort: meta.cohortId,
              subject: meta.subjectId,
              cohortSubject: cohortSubjectId,
              authorityMode,
              returnTo: currentReturnTo,
            })}><Button variant="secondary">Open attendance detail</Button></Link>
          ) : null}
        </div>
      ) : null}

      {!activeLoading && !activeError && projection === 'assessments-results' && performance ? (
        <div className="space-y-4">
          <StatStrip mdColumns={2} xlColumns={4}>
            <StatsCard title="Assessments" value={performance.assessment_completion?.total_assessments ?? 0} icon={ListChecks} color="blue" />
            <StatsCard title="Finalized" value={performance.assessment_completion?.finalized_assessments ?? 0} icon={ClipboardCheck} color="green" />
            <StatsCard title="Missing scores" value={performance.assessment_completion?.missing_scores_count ?? 0} icon={Users} color="orange" />
            <StatsCard title="Average" value={formatPercent(performance.generic_performance?.average_score ?? performance.cbc_performance?.average_weighted_score)} icon={FileBarChart} color="purple" />
          </StatStrip>
          <Card>
            <p className="text-sm theme-muted">{performance.note || 'No additional result-state note was returned.'}</p>
          </Card>
        </div>
      ) : null}

      {!activeLoading && !activeError && projection === 'assignments' && overview ? (
        overview.assignment_participation
          ? <ClassSubjectAssignmentParticipation participation={overview.assignment_participation} />
          : <EmptyProjection>No assignment participation is available for this term.</EmptyProjection>
      ) : null}

      {!activeLoading && !activeError && projection === 'curriculum-progress' && activity ? (
        <div className="space-y-4">
          <StatStrip mdColumns={2} xlColumns={4}>
            <StatsCard title="Coverage" value={formatPercent(recordNumber(activity.coverage?.percentage))} icon={Activity} color="green" />
            <StatsCard title="Covered items" value={recordNumber(activity.coverage?.covered) ?? '—'} icon={ClipboardCheck} color="blue" />
            <StatsCard title="Selected items" value={recordNumber(activity.coverage?.total) ?? '—'} icon={ListChecks} color="purple" />
            <StatsCard title="Sessions completed" value={activity.sessions_completed} icon={BookOpen} color="indigo" />
          </StatStrip>
          <Card>
            <p className="text-sm theme-muted">
              {String(activity.coverage?.note ?? (meta?.reportingSource === 'cbc'
                ? 'CBC evidence and competency facts remain owned by the CBC domain.'
                : 'This subject uses curriculum-appropriate teaching activity rather than CBC competency semantics.'))}
            </p>
          </Card>
          {meta?.reportingSource === 'cbc' && meta ? (
            <Link href={buildCbcCohortProgressHref(meta.cohortId, {
              term: effectiveTermId,
              subject: meta.subjectId,
              cohortSubject: cohortSubjectId,
              authorityMode,
              returnTo: currentReturnTo,
            })}><Button variant="secondary">Open CBC progress detail</Button></Link>
          ) : null}
        </div>
      ) : null}
    </ReportPageShell>
  );
}
