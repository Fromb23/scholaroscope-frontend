'use client';

import Link from 'next/link';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
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
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { learnerReportingAPI } from '@/app/core/api/reporting';
import {
  useLearnerAvailableReportScopes,
  useLearnerSubjectReport,
} from '@/app/core/hooks/useReporting';
import { useStudent } from '@/app/core/hooks/useStudents';
import type {
  LearnerAvailableReportScope,
  LearnerReportMetricItem,
  LearnerReportStrandSummary,
  LearnerSubjectReportAssignmentCompletionPoint,
  LearnerSubjectReportAttendanceTrendPoint,
  LearnerSubjectReportKeyIndicator,
  LearnerSubjectReportLearningTimelinePoint,
  LearnerSubjectReportMasteryDistributionPoint,
  ReportExportFormat,
  ReportRiskLevel,
} from '@/app/core/types/reporting';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import { downloadBlob } from '@/app/core/api/downloads';
import { buildLearnerSubjectReportHref } from '@/app/core/lib/learnerReportingRoutes';

type ReportViewMode = 'graph' | 'table';

function parsePositiveNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatPercent(value: number | null | undefined): string {
  return value == null ? '-' : `${value.toFixed(1)}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString();
}

function riskVariant(riskLevel: ReportRiskLevel): 'success' | 'warning' | 'danger' {
  if (riskLevel === 'LOW') {
    return 'success';
  }
  if (riskLevel === 'MEDIUM') {
    return 'warning';
  }
  return 'danger';
}

function participationLabel(status: string | null | undefined): string {
  switch (status) {
    case 'NOT_IN_SCOPE':
      return 'Not enrolled during this term';
    case 'NOT_ADMITTED_YET':
      return 'Not admitted during this term';
    case 'NOT_ENROLLED_IN_COHORT':
      return 'Not enrolled in this class during this term';
    case 'NOT_ENROLLED_IN_SUBJECT':
      return 'Not enrolled in this subject during this term';
    case 'JOINED_DURING_TERM':
      return 'Joined during this term';
    case 'LEFT_DURING_TERM':
      return 'Left during this term';
    case 'IN_SCOPE':
      return 'In scope for this term';
    default:
      return status ? status.replace(/_/g, ' ') : 'Term participation';
  }
}

function indicatorToneClass(tone: LearnerSubjectReportKeyIndicator['tone']): string {
  if (tone === 'success') {
    return 'theme-success-surface';
  }
  if (tone === 'warning') {
    return 'theme-warning-surface';
  }
  return 'theme-danger-surface';
}

function SubjectMetricCard({ indicator }: { indicator: LearnerSubjectReportKeyIndicator }) {
  return (
    <div className={`rounded-lg p-4 ${indicatorToneClass(indicator.tone)}`}>
      <p className="text-sm font-medium theme-muted">{indicator.label}</p>
      <p className="mt-2 text-2xl font-semibold theme-text">{indicator.value}</p>
      <p className="mt-1 text-sm theme-subtle">{indicator.note}</p>
    </div>
  );
}

function MetricList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: LearnerReportMetricItem[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold theme-text">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm theme-muted">{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <div key={`${title}-${item.type}-${item.label}`} className="rounded-lg border theme-border theme-surface-muted p-4">
              <p className="font-medium theme-text">{item.label}</p>
              <p className="mt-1 text-sm theme-muted">{item.metric}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function StrandTable({ rows }: { rows: LearnerReportStrandSummary[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 theme-subtle" />
        <h2 className="text-lg font-semibold theme-text">Strand Progress</h2>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm theme-muted">No strand progress has been recorded yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
                <th className="px-3 py-2">Strand</th>
                <th className="px-3 py-2 text-right">Selected</th>
                <th className="px-3 py-2 text-right">Covered</th>
                <th className="px-3 py-2 text-right">Mastered</th>
                <th className="px-3 py-2 text-right">Coverage</th>
                <th className="px-3 py-2 text-right">Mastery</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.strand_code}-${row.strand_name}`} className="border-b theme-border">
                  <td className="px-3 py-3">
                    <div className="font-medium theme-text">{row.strand_name}</div>
                    <div className="text-xs theme-subtle">{row.strand_code}</div>
                  </td>
                  <td className="px-3 py-3 text-right theme-muted">{row.selected_outcomes}</td>
                  <td className="px-3 py-3 text-right theme-muted">{row.taught_outcomes}</td>
                  <td className="px-3 py-3 text-right theme-muted">{row.mastered_outcomes}</td>
                  <td className="px-3 py-3 text-right theme-muted">{formatPercent(row.coverage_percentage)}</td>
                  <td className="px-3 py-3 text-right theme-muted">{formatPercent(row.mastery_percentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function BarListChart({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: Array<{
    key: string;
    label: string;
    value: string;
    percent: number;
    helper?: string;
  }>;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold theme-text">{title}</h2>
      </div>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.key} className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <div>
                <p className="font-medium theme-text">{item.label}</p>
                {item.helper ? <p className="theme-subtle">{item.helper}</p> : null}
              </div>
              <span className="shrink-0 theme-muted">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full theme-surface-muted">
              <div
                className="h-full rounded-full bg-[color:var(--color-primary)]"
                style={{ width: `${Math.max(0, Math.min(item.percent, 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function KeyValueTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold theme-text">{title}</h2>
      <div className="mt-4 divide-y theme-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-3 text-sm">
            <span className="theme-muted">{row.label}</span>
            <span className="text-right font-medium theme-text">{row.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
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

  const [viewMode, setViewMode] = useState<ReportViewMode>('graph');
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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

  const handleExport = useCallback(async (format: ReportExportFormat) => {
    if (!selectedCohortSubjectId || !Number.isFinite(learnerId) || !report) {
      return;
    }

    try {
      setExportError(null);
      setExporting(format);
      const file = await learnerReportingAPI.exportLearnerSubjectReport(learnerId, {
        format,
        cohortSubjectId: selectedCohortSubjectId,
      });
      downloadBlob(file.blob, file.fileName);
    } catch (error) {
      setExportError(
        extractErrorMessage(error as ApiError, 'Failed to export learner subject report'),
      );
    } finally {
      setExporting(null);
    }
  }, [learnerId, report, selectedCohortSubjectId]);

  const permissionDenied = selectedScopeAllowed && reportErrorStatus === 403;
  const showAccessState = (!scopesLoading && requestedCohortSubjectId != null && !selectedScopeAllowed) || permissionDenied;
  const canExport = Boolean(report) && !reportLoading && !reportError && !showAccessState;

  if (learnerLoading && !student) {
    return <LoadingSpinner message="Loading learner reporting context..." />;
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
              disabled={exporting !== null}
              onClick={() => void handleExport('pdf')}
            >
              <Download className="h-4 w-4" />
              {exporting === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={exporting !== null}
              onClick={() => void handleExport('xlsx')}
            >
              <Download className="h-4 w-4" />
              {exporting === 'xlsx' ? 'Exporting Excel...' : 'Export Excel'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={exporting !== null}
              onClick={() => void handleExport('csv')}
            >
              <Download className="h-4 w-4" />
              {exporting === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
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

      {exportError ? (
        <ErrorBanner message={exportError} onDismiss={() => setExportError(null)} />
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
                Loading report scopes...
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
          <LoadingSpinner message="Loading learner subject report..." />
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
                    <Badge variant={riskVariant(report.risk_level)}>{report.risk_level} risk</Badge>
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
                          {report.progress.outcomes_taught} of {report.progress.outcomes_selected} selected outcomes have been taught, and {report.progress.outcomes_mastered} have reached mastery.
                        </p>
                      </div>
                      <div className="rounded-lg border theme-border theme-surface-muted p-4">
                        <div className="font-medium theme-text">Assessment Performance</div>
                        <p className="mt-2 theme-muted">
                          Current assessment average: {formatPercent(report.assessments.numeric_average)}.
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

                <Card>
                  <h2 className="text-lg font-semibold theme-text">Latest Evidence</h2>
                  {report.progress.latest_evidence.length === 0 ? (
                    <p className="mt-4 text-sm theme-muted">No evidence rows are available yet.</p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
                            <th className="px-3 py-2">Observed</th>
                            <th className="px-3 py-2">Outcome</th>
                            <th className="px-3 py-2">Description</th>
                            <th className="px-3 py-2">Evaluation</th>
                            <th className="px-3 py-2">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.progress.latest_evidence.map((row) => (
                            <tr key={`${row.observed_at}-${row.learning_outcome_code}`} className="border-b theme-border">
                              <td className="px-3 py-3 theme-muted">{formatDate(row.observed_at)}</td>
                              <td className="px-3 py-3 theme-text">{row.learning_outcome_code}</td>
                              <td className="px-3 py-3 theme-muted">{row.learning_outcome_description}</td>
                              <td className="px-3 py-3 theme-muted">{row.evaluation_type}</td>
                              <td className="px-3 py-3 theme-muted">{row.source_type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
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
                    title="Learning Progress"
                    rows={[
                      { label: 'Outcomes selected', value: String(report.progress.outcomes_selected) },
                      { label: 'Outcomes taught', value: String(report.progress.outcomes_taught) },
                      { label: 'Outcomes mastered', value: String(report.progress.outcomes_mastered) },
                      { label: 'Coverage', value: formatPercent(report.progress.outcome_coverage_percentage) },
                      { label: 'Mastery', value: formatPercent(report.progress.mastery_percentage) },
                      { label: 'Evidence count', value: String(report.progress.evidence_count) },
                    ]}
                  />
                  <KeyValueTable
                    title="Assessment Performance"
                    rows={[
                      { label: 'Assessment count', value: String(report.assessments.assessment_count) },
                      { label: 'Finalized assessments', value: String(report.assessments.finalized_assessment_count) },
                      { label: 'Average score', value: formatPercent(report.assessments.numeric_average) },
                      { label: 'Grade', value: report.assessments.computed_grade?.letter_grade ?? '-' },
                      { label: 'Grade label', value: report.assessments.computed_grade?.letter_label ?? '-' },
                    ]}
                  />
                </div>

                <Card>
                  <h2 className="text-lg font-semibold theme-text">Latest Evidence</h2>
                  {report.progress.latest_evidence.length === 0 ? (
                    <p className="mt-4 text-sm theme-muted">No evidence rows are available yet.</p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
                            <th className="px-3 py-2">Observed</th>
                            <th className="px-3 py-2">Outcome</th>
                            <th className="px-3 py-2">Description</th>
                            <th className="px-3 py-2">Evaluation</th>
                            <th className="px-3 py-2">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.progress.latest_evidence.map((row) => (
                            <tr key={`${row.observed_at}-${row.learning_outcome_code}`} className="border-b theme-border">
                              <td className="px-3 py-3 theme-muted">{formatDate(row.observed_at)}</td>
                              <td className="px-3 py-3 theme-text">{row.learning_outcome_code}</td>
                              <td className="px-3 py-3 theme-muted">{row.learning_outcome_description}</td>
                              <td className="px-3 py-3 theme-muted">{row.evaluation_type}</td>
                              <td className="px-3 py-3 theme-muted">{row.source_type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

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
