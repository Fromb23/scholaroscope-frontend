'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Download,
  FileBarChart,
  GraduationCap,
  LineChart,
  Table2,
  Target,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import {
  ButtonPendingContent,
  EntityLoadingState,
  ReportPreparingState,
  SectionLoading,
} from '@/app/components/ui/loading';
import { Select } from '@/app/components/ui/Select';
import { learnerReportingAPI } from '@/app/core/api/reporting';
import {
  useLearnerAvailableReportScopes,
  useLearnerSubjectReport,
} from '@/app/core/hooks/useReporting';
import { useLearnerSubjectIntelligence } from '@/app/core/hooks/useAcademicIntelligence';
import { useStudent } from '@/app/core/hooks/useStudents';
import { LearnerSubjectIntelligencePanel } from '@/app/core/components/reports/AcademicInsightPrimitives';
import {
  BarListChart,
  formatDate,
  formatPercent,
  KeyValueTable,
  LatestEvidenceTable,
  MetricList,
  participationLabel,
  riskVariant,
  StrandTable,
  SubjectMetricCard,
} from '@/app/core/components/reports/LearnerSubjectReportPresentation';
import type {
  CbcCompetencyResult,
  LearnerAvailableReportScope,
  LearnerSubjectReportAssignmentCompletionPoint,
  LearnerSubjectReportAttendanceTrendPoint,
  LearnerSubjectReportLearningTimelinePoint,
  LearnerSubjectReportMasteryDistributionPoint,
} from '@/app/core/types/reporting';
import { useReportExport } from '@/app/core/hooks/reports/useReportExport';
import { buildLearnerSubjectReportHref } from '@/app/core/lib/learnerReportingRoutes';

type ReportViewMode = 'graph' | 'table';

function parsePositiveNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function ReportScopeButtons({
  learnerId,
  scopes,
  returnTo,
}: {
  learnerId: number;
  scopes: LearnerAvailableReportScope[];
  returnTo: string;
}) {
  if (scopes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {scopes.map((scope) => (
        <Link
          key={scope.cohort_subject_id}
          href={buildLearnerSubjectReportHref(learnerId, scope.cohort_subject_id, { returnTo })}
        >
          <Button variant="secondary" size="sm">
            {scope.subject_code} - {scope.subject_name}
          </Button>
        </Link>
      ))}
    </div>
  );
}

function AccessState({
  learnerId,
  scopes,
  title,
  description,
  returnTo,
}: {
  learnerId: number;
  scopes: LearnerAvailableReportScope[];
  title: string;
  description: string;
  returnTo: string;
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold theme-text">{title}</h2>
          <p className="text-sm theme-muted">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={returnTo}>
            <Button variant="secondary">Return to learner profile</Button>
          </Link>
        </div>

        <ReportScopeButtons learnerId={learnerId} scopes={scopes} returnTo={returnTo} />
      </div>
    </Card>
  );
}

function buildAttendanceTrendItems(points: LearnerSubjectReportAttendanceTrendPoint[]) {
  return points.map((point) => ({
    key: point.period,
    label: point.period,
    value: formatPercent(point.attendance_rate),
    percent: point.attendance_rate ?? 0,
    helper: `${point.sessions_attended}/${point.sessions_total} lessons attended`,
  }));
}

function buildAssignmentCompletionItems(points: LearnerSubjectReportAssignmentCompletionPoint[]) {
  return points.map((point) => ({
    key: point.label,
    label: point.label,
    value: `${point.count}/${point.total}`,
    percent: point.total > 0 ? (point.count / point.total) * 100 : 0,
  }));
}

function buildMasteryItems(points: LearnerSubjectReportMasteryDistributionPoint[]) {
  const total = points.reduce((sum, point) => sum + point.count, 0);
  return points.map((point) => ({
    key: point.level,
    label: point.level.replace(/_/g, ' '),
    value: String(point.count),
    percent: total > 0 ? (point.count / total) * 100 : 0,
  }));
}

function buildLearningTimelineItems(points: LearnerSubjectReportLearningTimelinePoint[]) {
  const maxEvidence = points.reduce((max, point) => Math.max(max, point.evidence_count), 0);
  return points.map((point) => ({
    key: point.period,
    label: point.period,
    value: `${point.evidence_count} evidence`,
    percent: maxEvidence > 0 ? (point.evidence_count / maxEvidence) * 100 : 0,
    helper: `${point.assignments_submitted}/${point.assignments_total} assignments submitted`,
  }));
}

function labelize(value: string | null | undefined): string {
  return String(value ?? '').replace(/_/g, ' ').trim() || 'Not available';
}

function formatCbcCompetency(competency: CbcCompetencyResult | null | undefined): string {
  if (!competency) return 'CBC result pending';
  const performance = competency.performance;
  if (performance.level) {
    return performance.label ? `${performance.level} - ${performance.label}` : performance.level;
  }
  return labelize(performance.status);
}

function CbcCompetencyReportCard({
  competency,
}: {
  competency: CbcCompetencyResult;
}) {
  const performance = competency.performance;
  const strengths = competency.strengths ?? [];
  const support = competency.support_needed ?? [];

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide theme-subtle">CBC Competency Result</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-3xl font-semibold theme-text">
              {performance.level || labelize(performance.status)}
            </span>
            {performance.label ? (
              <span className="text-sm font-medium theme-muted">{performance.label}</span>
            ) : null}
            <Badge variant={performance.status === 'FINAL' ? 'green' : 'orange'}>
              {labelize(performance.status)}
            </Badge>
            {competency.readiness?.is_stale ? <Badge variant="orange">Stale</Badge> : null}
          </div>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:min-w-[28rem]">
          <div className="rounded-lg border theme-border theme-surface-muted px-3 py-2">
            <p className="text-xs theme-subtle">Outcomes observed</p>
            <p className="mt-1 text-lg font-semibold theme-text">
              {competency.coverage.outcomes_observed}/{competency.coverage.outcomes_taught}
            </p>
          </div>
          <div className="rounded-lg border theme-border theme-surface-muted px-3 py-2">
            <p className="text-xs theme-subtle">Evidence records</p>
            <p className="mt-1 text-lg font-semibold theme-text">
              {competency.evidence_summary.total}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <KeyValueTable
          title="Competency Coverage"
          rows={[
            { label: 'Outcomes selected', value: String(competency.coverage.outcomes_selected) },
            { label: 'Outcomes taught', value: String(competency.coverage.outcomes_taught) },
            { label: 'Outcomes observed', value: String(competency.coverage.outcomes_observed) },
            { label: 'Taught not observed', value: String(competency.coverage.outcomes_taught_not_observed) },
          ]}
        />
        <KeyValueTable
          title="Outcome Distribution"
          rows={[
            { label: 'Exceeding Expectations', value: String(competency.distribution.EE ?? 0) },
            { label: 'Meeting Expectations', value: String(competency.distribution.ME ?? 0) },
            { label: 'Approaching Expectations', value: String(competency.distribution.AE ?? 0) },
            { label: 'Below Expectations', value: String(competency.distribution.BE ?? 0) },
            { label: 'Provisional', value: String(competency.distribution.PROVISIONAL ?? 0) },
            { label: 'No evidence', value: String(competency.distribution.NO_EVIDENCE ?? 0) },
          ]}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <OutcomeSummaryList title="Strengths" items={strengths} emptyText="No final ME or EE outcomes recorded." />
        <OutcomeSummaryList title="Support Needed" items={support} emptyText="No final AE or BE outcomes recorded." />
      </div>
    </Card>
  );
}

function OutcomeSummaryList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: CbcCompetencyResult['strengths'];
  emptyText: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold theme-text">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm theme-muted">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.slice(0, 5).map((item) => (
            <li key={`${title}-${item.outcome_id}`} className="rounded-lg border theme-border theme-surface-muted p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium theme-text">{item.code}</span>
                {item.level ? <Badge variant="green">{item.level}</Badge> : null}
              </div>
              <p className="mt-1 text-sm theme-muted">{item.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LearnerSubjectReportPage() {
  const params = useParams<{ learnerId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const learnerId = Number(params.learnerId);
  const requestedCohortSubjectId = parsePositiveNumber(searchParams.get('cohort_subject'));
  const returnTo = searchParams.get('returnTo') || `/learners/${learnerId}`;

  const { student, loading: learnerLoading, error: learnerError } = useStudent(learnerId);
  const {
    scopes,
    loading: scopesLoading,
    error: scopesError,
  } = useLearnerAvailableReportScopes(
    Number.isFinite(learnerId) && learnerId > 0 ? learnerId : null,
  );

  const allowedSubjectScopes = useMemo(
    () => scopes?.subject_scopes ?? [],
    [scopes?.subject_scopes],
  );
  const allowedSubjectScopeIds = useMemo(
    () => new Set(allowedSubjectScopes.map((scope) => scope.cohort_subject_id)),
    [allowedSubjectScopes],
  );
  const selectedCohortSubjectId = requestedCohortSubjectId && allowedSubjectScopeIds.has(requestedCohortSubjectId)
    ? requestedCohortSubjectId
    : null;
  const selectedScopeAllowed = requestedCohortSubjectId != null && allowedSubjectScopeIds.has(requestedCohortSubjectId);

  const {
    report,
    loading: reportLoading,
    error: reportError,
    errorStatus: reportErrorStatus,
    refetch,
  } = useLearnerSubjectReport(
    Number.isFinite(learnerId) && learnerId > 0 ? learnerId : null,
    selectedCohortSubjectId,
    { enabled: Boolean(selectedCohortSubjectId) },
  );
  const {
    intelligence: subjectIntelligence,
    loading: intelligenceLoading,
    error: intelligenceError,
    refetch: refetchIntelligence,
  } = useLearnerSubjectIntelligence(
    Number.isFinite(learnerId) && learnerId > 0 ? learnerId : null,
    selectedCohortSubjectId,
    { enabled: Boolean(selectedCohortSubjectId), includeEvidence: true },
  );

  const [viewMode, setViewMode] = useState<ReportViewMode>('graph');

  const subjectOptions = useMemo(() => {
    return allowedSubjectScopes.map((scope) => ({
      id: scope.cohort_subject_id,
      label: `${scope.subject_code} - ${scope.subject_name} (${scope.cohort_name})`,
    }));
  }, [allowedSubjectScopes]);

  const updateCohortSubject = useCallback((cohortSubjectId: number | null) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (cohortSubjectId) {
      nextParams.set('cohort_subject', String(cohortSubjectId));
    } else {
      nextParams.delete('cohort_subject');
    }
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (scopesLoading) {
      return;
    }
    if (!requestedCohortSubjectId && subjectOptions.length === 1) {
      updateCohortSubject(subjectOptions[0].id);
    }
  }, [requestedCohortSubjectId, scopesLoading, subjectOptions, updateCohortSubject]);

  const { handleExport, exporting } = useReportExport(async (format) => {
    if (!selectedCohortSubjectId || !Number.isFinite(learnerId) || !report) {
      throw new Error('Open a learner subject report before exporting.');
    }

    return learnerReportingAPI.exportLearnerSubjectReport(learnerId, {
      format,
      cohortSubjectId: selectedCohortSubjectId,
    });
  }, 'learner subject report');

  const permissionDenied = selectedScopeAllowed && reportErrorStatus === 403;
  const showAccessState = (!scopesLoading && requestedCohortSubjectId != null && !selectedScopeAllowed) || permissionDenied;
  const canExport = Boolean(report) && !reportLoading && !reportError && !showAccessState;
  const isCbcReport = report?.reporting_source === 'cbc';
  const cbcCompetency = report?.progress.competency_result ?? null;

  if (learnerLoading && !student) {
    return <EntityLoadingState entity="learner reporting context" action="Loading" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={returnTo}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back to Learner Profile
            </Button>
          </Link>
          <div className="mt-3">
            <h1 className="text-2xl font-semibold theme-text">Learner Subject Report</h1>
            <p className="mt-1 text-sm theme-muted">
              A summary-first subject report focused on status, strengths, support needs, and next teaching action.
            </p>
          </div>
        </div>

        {canExport ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={exporting}
              onClick={() => void handleExport('pdf')}
            >
              <ButtonPendingContent pending={exporting} pendingLabel="Preparing PDF...">
                <Download className="h-4 w-4" />
                Export PDF
              </ButtonPendingContent>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={exporting}
              onClick={() => void handleExport('xlsx')}
            >
              <ButtonPendingContent pending={exporting} pendingLabel="Preparing Excel...">
                <Download className="h-4 w-4" />
                Export Excel
              </ButtonPendingContent>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={exporting}
              onClick={() => void handleExport('csv')}
            >
              <ButtonPendingContent pending={exporting} pendingLabel="Preparing CSV...">
                <Download className="h-4 w-4" />
                Export CSV
              </ButtonPendingContent>
            </Button>
          </div>
        ) : null}
      </div>

      {learnerError ? (
        <ErrorBanner message={learnerError} onDismiss={() => undefined} />
      ) : null}

      {scopesError ? (
        <ErrorBanner message={scopesError} onDismiss={() => undefined} />
      ) : null}

      <Card>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Learner</p>
            <div className="flex items-center gap-3">
              <div className="theme-info-surface flex h-12 w-12 items-center justify-center rounded-xl">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold theme-text">
                  {scopes?.learner.name ?? report?.learner.name ?? student?.full_name ?? 'Learner'}
                </p>
                <p className="text-sm theme-muted">
                  {scopes?.learner.admission_number ?? report?.learner.admission_number ?? student?.admission_number ?? '-'}
                </p>
              </div>
            </div>
          </div>

          <div>
            {scopesLoading ? (
              <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm theme-muted">
                Loading learner subject report scopes...
              </div>
            ) : (
              <Select
                label="Subject Scope"
                value={selectedCohortSubjectId?.toString() ?? ''}
                onChange={(event) => updateCohortSubject(
                  event.target.value ? Number(event.target.value) : null,
                )}
                options={[
                  { value: '', label: 'Select subject report scope...' },
                  ...subjectOptions.map((option) => ({
                    value: String(option.id),
                    label: option.label,
                  })),
                ]}
              />
            )}
          </div>
        </div>
      </Card>

      {!scopesLoading && allowedSubjectScopes.length === 0 ? (
        <AccessState
          learnerId={learnerId}
          scopes={allowedSubjectScopes}
          title="You do not have access to this learner report."
          description="Return to learner profile or choose one of your assigned subjects."
          returnTo={returnTo}
        />
      ) : null}

      {showAccessState ? (
        <AccessState
          learnerId={learnerId}
          scopes={allowedSubjectScopes}
          title="You do not have access to this learner report."
          description="Return to learner profile or choose one of your assigned subjects."
          returnTo={returnTo}
        />
      ) : null}

      {!scopesLoading && !showAccessState && !selectedCohortSubjectId && allowedSubjectScopes.length > 1 ? (
        <Card>
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold theme-text">Choose a subject report</h2>
              <p className="text-sm theme-muted">
                Select one of your allowed learner subject scopes to load the preview.
              </p>
            </div>
            <ReportScopeButtons learnerId={learnerId} scopes={allowedSubjectScopes} returnTo={returnTo} />
          </div>
        </Card>
      ) : null}

      {!showAccessState && selectedCohortSubjectId ? (
        reportLoading ? (
          <ReportPreparingState
            title={`Building ${student?.full_name ?? 'learner'}'s subject report...`}
            steps={[
              'Collecting learner profile',
              'Reading attendance and assignment signals',
              'Calculating learning and participation risk',
              'Preparing recommendations',
            ]}
            activeStep={1}
          />
        ) : reportError ? (
          <ErrorBanner
            message={reportError}
            onDismiss={() => void refetch()}
          />
        ) : report ? (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {isCbcReport && cbcCompetency ? (
                      <Badge variant={cbcCompetency.performance.status === 'FINAL' ? 'green' : 'orange'}>
                        {formatCbcCompetency(cbcCompetency)}
                      </Badge>
                    ) : (
                      <Badge variant={riskVariant(report.risk_level)}>{report.risk_level} risk</Badge>
                    )}
                    <Badge variant="blue">{report.subject.code}</Badge>
                    <Badge variant="default">{report.cohort.name}</Badge>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold theme-text">
                      {report.subject.name}
                    </h2>
                    <p className="text-sm theme-muted">
                      {report.period?.label ? `${report.period.label} · ` : ''}Generated {formatDate(report.generated_at)} for {report.cohort.name}
                    </p>
                  </div>
                  <p className="text-sm theme-text">{report.teacher_summary}</p>
                </div>

                <div className="theme-surface-muted flex gap-1 rounded-xl border theme-border p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('graph')}
                    className={[
                      'theme-focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      viewMode === 'graph'
                        ? 'theme-info-surface'
                        : 'theme-muted hover:text-[color:var(--color-text)]',
                    ].join(' ')}
                  >
                    <LineChart className="h-4 w-4" />
                    Graph view
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={[
                      'theme-focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      viewMode === 'table'
                        ? 'theme-info-surface'
                        : 'theme-muted hover:text-[color:var(--color-text)]',
                    ].join(' ')}
                  >
                    <Table2 className="h-4 w-4" />
                    Table view
                  </button>
                </div>
              </div>
            </Card>

            {isCbcReport && cbcCompetency ? (
              <CbcCompetencyReportCard competency={cbcCompetency} />
            ) : null}

            {!isCbcReport && intelligenceLoading ? (
              <SectionLoading title="Loading learner subject intelligence..." />
            ) : !isCbcReport && intelligenceError ? (
              <ErrorBanner
                message={intelligenceError}
                onDismiss={() => void refetchIntelligence()}
              />
            ) : !isCbcReport && subjectIntelligence ? (
              <LearnerSubjectIntelligencePanel intelligence={subjectIntelligence} />
            ) : null}

            {viewMode === 'graph' ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {report.key_indicators.map((indicator) => (
                    <SubjectMetricCard key={indicator.key} indicator={indicator} />
                  ))}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <BarListChart
                    title="Attendance Trend"
                    icon={<LineChart className="h-5 w-5 theme-subtle" />}
                    items={buildAttendanceTrendItems(report.charts.attendance_trend)}
                  />
                  <BarListChart
                    title="Assignment Completion"
                    icon={<BarChart3 className="h-5 w-5 theme-subtle" />}
                    items={buildAssignmentCompletionItems(report.charts.assignment_completion)}
                  />
                  <BarListChart
                    title="Outcome Mastery Distribution"
                    icon={<Target className="h-5 w-5 theme-subtle" />}
                    items={buildMasteryItems(report.charts.mastery_distribution)}
                  />
                  <BarListChart
                    title="Learning Timeline"
                    icon={<FileBarChart className="h-5 w-5 theme-subtle" />}
                    items={buildLearningTimelineItems(report.charts.learning_timeline)}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <h2 className="text-lg font-semibold theme-text">Teacher Summary</h2>
                    <div className="mt-4 space-y-4 text-sm">
                      <div className="rounded-lg border theme-border theme-surface-muted p-4">
                        <div className="font-medium theme-text">Attendance</div>
                        <p className="mt-2 theme-muted">
                          The learner attended {report.attendance.sessions_attended} out of {report.attendance.sessions_total} recorded lessons.
                        </p>
                      </div>
                      <div className="rounded-lg border theme-border theme-surface-muted p-4">
                        <div className="font-medium theme-text">Assignment Participation</div>
                        <p className="mt-2 theme-muted">
                          The learner has submitted {report.assignments.assignments_submitted} of {report.assignments.assignments_total} assignments, with {report.assignments.assignments_missing} currently missing.
                        </p>
                      </div>
                      <div className="rounded-lg border theme-border theme-surface-muted p-4">
                        <div className="font-medium theme-text">Learning Progress</div>
                        <p className="mt-2 theme-muted">
                          {isCbcReport && cbcCompetency
                            ? `${cbcCompetency.coverage.outcomes_observed} of ${cbcCompetency.coverage.outcomes_taught} taught outcomes have eligible evidence. Current competency judgement: ${formatCbcCompetency(cbcCompetency)}.`
                            : `${report.progress.outcomes_taught} of ${report.progress.outcomes_selected} selected outcomes have been taught, and ${report.progress.outcomes_mastered} have reached mastery.`}
                        </p>
                      </div>
                      <div className="rounded-lg border theme-border theme-surface-muted p-4">
                        <div className="font-medium theme-text">
                          {isCbcReport ? 'Assessment Computation Details' : 'Assessment Performance'}
                        </div>
                        <p className="mt-2 theme-muted">
                          {isCbcReport
                            ? `Assessment indicator: ${formatPercent(report.assessments.cbc_result?.weighted_score ?? report.assessments.numeric_average)}.`
                            : `Current assessment average: ${formatPercent(report.assessments.numeric_average)}.`}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <h2 className="text-lg font-semibold theme-text">Recommended Teacher Actions</h2>
                    <ul className="mt-4 space-y-3">
                      {report.recommended_actions.map((action) => (
                        <li key={action} className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm theme-text">
                          {action}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>

                <StrandTable rows={report.charts.strand_progress} />

                <div className="grid gap-4 xl:grid-cols-2">
                  <MetricList
                    title="Strengths"
                    items={report.strengths}
                    emptyMessage="No clear strengths have been surfaced yet from the current data."
                  />
                  <MetricList
                    title="Areas Needing Support"
                    items={report.areas_needing_support}
                    emptyMessage="No support areas are currently flagged."
                  />
                </div>

                <LatestEvidenceTable rows={report.progress.latest_evidence} />
              </>
            ) : (
              <>
                {report.term_participation ? (
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Term Participation</h2>
                        <p className="mt-1 text-sm text-gray-600">
                          {report.term_participation.message || participationLabel(report.term_participation.status)}
                        </p>
                      </div>
                      <Badge variant={report.term_participation.in_scope ? 'blue' : 'default'}>
                        {participationLabel(report.term_participation.status)}
                      </Badge>
                    </div>
                    {report.term_participation.in_scope && report.term_participation.effective_from ? (
                      <p className="mt-3 text-sm text-gray-600">
                        Metrics begin from {formatDate(report.term_participation.overlap_start ?? report.term_participation.effective_from)}.
                      </p>
                    ) : null}
                  </Card>
                ) : null}
                {report.term_participation && !report.term_participation.in_scope ? (
                  <Card>
                    <p className="text-sm text-gray-600">
                      This report is a historical participation view. No score, attendance rate, risk level, ranking, or CBC point is shown because the learner was not academically in scope.
                    </p>
                  </Card>
                ) : (
                  <>
                <div className="grid gap-4 xl:grid-cols-2">
                  <KeyValueTable
                    title="Learner Details"
                    rows={[
                      { label: 'Learner name', value: report.learner.name },
                      { label: 'Admission number', value: report.learner.admission_number },
                      { label: 'Class / cohort', value: report.cohort.name },
                      { label: 'Subject', value: report.subject.name },
                      { label: 'Report date', value: formatDate(report.generated_at) },
                    ]}
                  />
                  <KeyValueTable
                    title="Key Indicators"
                    rows={report.key_indicators.map((indicator) => ({
                      label: `${indicator.label} (${indicator.note})`,
                      value: indicator.value,
                    }))}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <KeyValueTable
                    title="Attendance"
                    rows={[
                      { label: 'Attendance rate', value: formatPercent(report.attendance.attendance_rate) },
                      { label: 'Recorded lessons', value: String(report.attendance.sessions_total) },
                      { label: 'Lessons attended', value: String(report.attendance.sessions_attended) },
                      { label: 'Lessons missed', value: String(report.attendance.sessions_missed) },
                      { label: 'Late count', value: String(report.attendance.late_count) },
                      { label: 'Excused count', value: String(report.attendance.excused_count) },
                    ]}
                  />
                  <KeyValueTable
                    title="Assignment Participation"
                    rows={[
                      { label: 'Assignments total', value: String(report.assignments.assignments_total) },
                      { label: 'Assignments submitted', value: String(report.assignments.assignments_submitted) },
                      { label: 'Assignments reviewed', value: String(report.assignments.assignments_reviewed) },
                      { label: 'Assignments missing', value: String(report.assignments.assignments_missing) },
                      { label: 'Completion rate', value: formatPercent(report.assignments.assignment_completion_rate) },
                    ]}
                  />
                  <KeyValueTable
                    title={isCbcReport ? 'CBC Competency Result' : 'Learning Progress'}
                    rows={isCbcReport
                      ? cbcCompetency
                        ? [
                            { label: 'Performance', value: formatCbcCompetency(cbcCompetency) },
                            { label: 'Status', value: labelize(cbcCompetency.performance.status) },
                            { label: 'Outcomes selected', value: String(cbcCompetency.coverage.outcomes_selected) },
                            { label: 'Outcomes taught', value: String(cbcCompetency.coverage.outcomes_taught) },
                            { label: 'Outcomes observed', value: String(cbcCompetency.coverage.outcomes_observed) },
                            { label: 'Taught not observed', value: String(cbcCompetency.coverage.outcomes_taught_not_observed) },
                            { label: 'Evidence count', value: String(cbcCompetency.evidence_summary.total) },
                          ]
                        : [
                            { label: 'Performance', value: 'CBC result pending' },
                            { label: 'Evidence count', value: String(report.progress.evidence_count) },
                          ]
                      : [
                          { label: 'Outcomes selected', value: String(report.progress.outcomes_selected) },
                          { label: 'Outcomes taught', value: String(report.progress.outcomes_taught) },
                          { label: 'Outcomes mastered', value: String(report.progress.outcomes_mastered) },
                          { label: 'Coverage', value: formatPercent(report.progress.outcome_coverage_percentage) },
                          { label: 'Mastery', value: formatPercent(report.progress.mastery_percentage) },
                          { label: 'Evidence count', value: String(report.progress.evidence_count) },
                        ]}
                  />
                  <KeyValueTable
                    title={isCbcReport ? 'Assessment Computation Details' : 'Assessment Performance'}
                    rows={isCbcReport
                      ? [
                          { label: 'Assessment count', value: String(report.assessments.assessment_count) },
                          { label: 'Finalized assessments', value: String(report.assessments.finalized_assessment_count) },
                          { label: 'Assessment indicator', value: formatPercent(report.assessments.cbc_result?.weighted_score ?? report.assessments.numeric_average) },
                          { label: 'Indicator status', value: labelize(report.assessments.cbc_result?.result_status) },
                        ]
                      : [
                          { label: 'Assessment count', value: String(report.assessments.assessment_count) },
                          { label: 'Finalized assessments', value: String(report.assessments.finalized_assessment_count) },
                          { label: 'Average score', value: formatPercent(report.assessments.numeric_average) },
                          { label: 'Grade', value: report.assessments.computed_grade?.letter_grade ?? '-' },
                          { label: 'Grade label', value: report.assessments.computed_grade?.letter_label ?? '-' },
                        ]}
                  />
                </div>

                <LatestEvidenceTable rows={report.progress.latest_evidence} />

                <StrandTable rows={report.charts.strand_progress} />
                  </>
                )}
              </>
            )}
          </div>
        ) : null
      ) : null}
    </div>
  );
}
