'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Layers,
  LineChart,
  Table2,
  Trophy,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { EntityLoadingState, ReportPreparingState } from '@/app/components/ui/loading';
import { Select } from '@/app/components/ui/Select';
import { isSafeNextPath } from '@/app/core/auth/navigation';
import {
  useLearnerAssessmentReport,
  useLearnerAvailableReportScopes,
} from '@/app/core/hooks/useReporting';
import { buildLearnerAssessmentReportHref } from '@/app/core/lib/learnerReportingRoutes';
import { formatDate, formatPercent } from '@/app/core/components/reports/LearnerSubjectReportPresentation';
import type {
  LearnerAssessmentAcademicYearTrendPoint,
  LearnerAssessmentReportPayload,
  LearnerAssessmentReportRow,
  LearnerAssessmentSubjectBreakdownPoint,
  LearnerAssessmentTermTrendPoint,
  LearnerAvailableReportScope,
} from '@/app/core/types/reporting';
import type { AppError } from '@/app/core/errors';

type AssessmentReportViewMode = 'summary' | 'terms' | 'academic_years' | 'subjects';
const VIEW_OPTIONS: Array<{ value: AssessmentReportViewMode; label: string; icon: typeof Table2 }> = [
  { value: 'summary', label: 'Category', icon: Table2 },
  { value: 'terms', label: 'Terms', icon: LineChart },
  { value: 'academic_years', label: 'Years', icon: BarChart3 },
  { value: 'subjects', label: 'Subjects', icon: BookOpen },
];

function parsePositiveNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseViewMode(value: string | null): AssessmentReportViewMode {
  return value === 'terms' || value === 'academic_years' || value === 'subjects'
    ? value
    : 'summary';
}

function metricValue(value: number | null): string {
  return value == null ? '-' : formatPercent(value);
}

const learnerAssessmentReportError = (message: string): AppError => ({
  kind: 'report_not_ready',
  title: 'This learner assessment report is not ready yet.',
  message,
  retryable: true,
  severity: 'warning',
  actionLabel: 'Try again',
});

function scoreValue(row: LearnerAssessmentReportRow): string {
  if (row.score != null && row.total_marks != null) {
    return `${row.score}/${row.total_marks}`;
  }
  if (row.rubric_level_label || row.rubric_level_code) {
    return [row.rubric_level_label, row.rubric_level_code].filter(Boolean).join(' ');
  }
  return '-';
}

function statusVariant(status: string): 'success' | 'warning' | 'default' {
  if (status === 'FINALIZED' || status === 'GRADED') return 'success';
  if (status === 'ACTIVE' || status === 'PENDING_REVIEW') return 'warning';
  return 'default';
}

function SummaryCard({ title, value, helper, icon: Icon }: {
  title: string;
  value: string;
  helper?: string;
  icon: typeof FileText;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium theme-muted">{title}</p>
          <p className="mt-2 text-2xl font-semibold theme-text">{value}</p>
          {helper ? <p className="mt-1 text-xs theme-subtle">{helper}</p> : null}
        </div>
        <div className="theme-info-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function AccessState({ learnerId, scopes, returnTo, assessmentId, assessmentType, termId }: {
  learnerId: number;
  scopes: LearnerAvailableReportScope[];
  returnTo: string;
  assessmentId: number | null;
  assessmentType: string | null;
  termId: number | null;
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold theme-text">Assessment report access is limited</h2>
          <p className="mt-1 text-sm theme-muted">
            This report only includes learner scores from subject scopes assigned to you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={returnTo}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          {scopes.map((scope) => (
            <Link
              key={scope.cohort_subject_id}
              href={buildLearnerAssessmentReportHref(learnerId, {
                assessmentId,
                cohortSubjectId: scope.cohort_subject_id,
                assessmentType,
                termId,
                returnTo,
              })}
            >
              <Button variant="ghost" size="sm">
                {scope.subject_code} - {scope.subject_name}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}

function FilterControls({
  report,
  assessmentType,
  cohortSubjectId,
  termId,
  academicYearId,
  onChange,
}: {
  report: LearnerAssessmentReportPayload | null;
  assessmentType: string | null;
  cohortSubjectId: number | null;
  termId: number | null;
  academicYearId: number | null;
  onChange: (updates: Record<string, string | number | null>) => void;
}) {
  const filters = report?.available_filters;

  return (
    <Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Select
          label="Academic Year"
          value={academicYearId?.toString() ?? ''}
          onChange={(event) => onChange({ academic_year: event.target.value ? Number(event.target.value) : null })}
          options={[
            { value: '', label: 'All years' },
            ...(filters?.academic_years ?? []).map((year) => ({
              value: String(year.id),
              label: year.name,
            })),
          ]}
        />
        <Select
          label="Term"
          value={termId?.toString() ?? ''}
          onChange={(event) => onChange({ term: event.target.value ? Number(event.target.value) : null })}
          options={[
            { value: '', label: 'All terms' },
            ...(filters?.terms ?? []).map((term) => ({
              value: String(term.id),
              label: `${term.name} (${term.academic_year_name})`,
            })),
          ]}
        />
        <Select
          label="Subject Scope"
          value={cohortSubjectId?.toString() ?? ''}
          onChange={(event) => onChange({ cohort_subject: event.target.value ? Number(event.target.value) : null })}
          options={[
            { value: '', label: 'All visible subjects' },
            ...(filters?.subjects ?? []).map((subject) => ({
              value: String(subject.cohort_subject_id),
              label: `${subject.subject_code} - ${subject.subject_name} (${subject.cohort_name})`,
            })),
          ]}
        />
        <Select
          label="Assessment Category"
          value={assessmentType ?? ''}
          onChange={(event) => onChange({ assessment_type: event.target.value || null })}
          options={[
            { value: '', label: 'All categories' },
            ...(filters?.assessment_types ?? []).map((type) => ({
              value: type.value,
              label: `${type.label} (${type.count})`,
            })),
          ]}
        />
      </div>
    </Card>
  );
}

function ViewModeTabs({
  value,
  onChange,
}: {
  value: AssessmentReportViewMode;
  onChange: (value: AssessmentReportViewMode) => void;
}) {
  return (
    <div className="theme-surface-muted flex flex-wrap gap-1 rounded-lg border theme-border p-1">
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'theme-focus-ring inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
              value === option.value
                ? 'theme-info-surface'
                : 'theme-muted hover:text-[color:var(--color-text)]',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function AssessmentRowsTable({ rows }: { rows: LearnerAssessmentReportRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm theme-muted">No assessment scores match the selected context.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full divide-y theme-border text-sm">
          <thead className="theme-surface-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium theme-muted">Assessment</th>
              <th className="px-4 py-3 text-left font-medium theme-muted">Date</th>
              <th className="px-4 py-3 text-left font-medium theme-muted">Term</th>
              <th className="px-4 py-3 text-left font-medium theme-muted">Subject</th>
              <th className="px-4 py-3 text-left font-medium theme-muted">Score</th>
              <th className="px-4 py-3 text-left font-medium theme-muted">Percentage</th>
              <th className="px-4 py-3 text-left font-medium theme-muted">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border">
            {rows.map((row) => (
              <tr key={`${row.assessment_id}-${row.cohort_subject_id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium theme-text">{row.assessment_name}</div>
                  <div className="mt-1 text-xs theme-subtle">{row.assessment_type_display}</div>
                </td>
                <td className="px-4 py-3 theme-muted">{formatDate(row.assessment_date)}</td>
                <td className="px-4 py-3 theme-muted">
                  {row.term_name ?? '-'}
                  {row.academic_year_name ? (
                    <span className="block text-xs theme-subtle">{row.academic_year_name}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 theme-muted">
                  {row.subject_code} - {row.subject_name}
                  <span className="block text-xs theme-subtle">{row.cohort_name}</span>
                </td>
                <td className="px-4 py-3 theme-text">{scoreValue(row)}</td>
                <td className="px-4 py-3 theme-text">{metricValue(row.percentage)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(row.assessment_status)}>
                      {row.assessment_status.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant={statusVariant(row.score_status)}>
                      {row.score_status_display}
                    </Badge>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TermsView({ rows }: { rows: LearnerAssessmentTermTrendPoint[] }) {
  if (rows.length === 0) {
    return <Card><p className="text-sm theme-muted">No term trend is available for the selected filters.</p></Card>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <Card key={`${row.academic_year_id ?? 'none'}-${row.term_id ?? 'none'}`} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold theme-text">{row.term_name ?? 'No term'}</h3>
              <p className="mt-1 text-sm theme-muted">{row.academic_year_name ?? 'No academic year'}</p>
            </div>
            <Badge variant="blue">{row.assessment_count} assessments</Badge>
          </div>
          <p className="mt-4 text-2xl font-semibold theme-text">{metricValue(row.average_percentage)}</p>
          <p className="mt-1 text-xs theme-subtle">Latest score date {formatDate(row.latest_assessment_date)}</p>
        </Card>
      ))}
    </div>
  );
}

function AcademicYearsView({ rows }: { rows: LearnerAssessmentAcademicYearTrendPoint[] }) {
  if (rows.length === 0) {
    return <Card><p className="text-sm theme-muted">No academic year trend is available for the selected filters.</p></Card>;
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-[640px] w-full divide-y theme-border text-sm">
          <thead className="theme-surface-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium theme-muted">Academic Year</th>
              <th className="px-4 py-3 text-left font-medium theme-muted">Assessment Count</th>
              <th className="px-4 py-3 text-left font-medium theme-muted">Average</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border">
            {rows.map((row) => (
              <tr key={row.academic_year_id ?? 'none'}>
                <td className="px-4 py-3 font-medium theme-text">{row.academic_year_name ?? 'No academic year'}</td>
                <td className="px-4 py-3 theme-muted">{row.assessment_count}</td>
                <td className="px-4 py-3 theme-text">{metricValue(row.average_percentage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SubjectsView({
  rows,
  canCompareSubjects,
}: {
  rows: LearnerAssessmentSubjectBreakdownPoint[];
  canCompareSubjects: boolean;
}) {
  if (rows.length === 0) {
    return <Card><p className="text-sm theme-muted">No subject breakdown is available for the selected filters.</p></Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-3">
          <div className="theme-info-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold theme-text">Subject Performance</h2>
            <p className="mt-1 text-sm theme-muted">
              {canCompareSubjects
                ? 'Visible subject scopes are shown for this learner and category.'
                : 'Only your assigned subject scopes are shown for this learner and category.'}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <Card key={row.cohort_subject_id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold theme-text">{row.subject_name}</h3>
                <p className="mt-1 text-sm theme-muted">{row.subject_code} · {row.cohort_name}</p>
              </div>
              <Badge variant="default">{row.assessment_count}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="theme-subtle">Average</p>
                <p className="mt-1 font-semibold theme-text">{metricValue(row.average_percentage)}</p>
              </div>
              <div>
                <p className="theme-subtle">Latest</p>
                <p className="mt-1 font-semibold theme-text">{metricValue(row.latest_percentage)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function LearnerAssessmentReportPage() {
  const params = useParams<{ learnerId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const learnerId = Number(params.learnerId);
  const assessmentId = parsePositiveNumber(searchParams.get('assessment') ?? searchParams.get('assessment_id'));
  const cohortSubjectId = parsePositiveNumber(searchParams.get('cohort_subject') ?? searchParams.get('cohort_subject_id'));
  const termId = parsePositiveNumber(searchParams.get('term') ?? searchParams.get('term_id'));
  const subjectId = parsePositiveNumber(searchParams.get('subject') ?? searchParams.get('subject_id'));
  const cohortId = parsePositiveNumber(searchParams.get('cohort') ?? searchParams.get('cohort_id'));
  const academicYearId = parsePositiveNumber(searchParams.get('academic_year') ?? searchParams.get('academic_year_id'));
  const assessmentType = searchParams.get('assessment_type') || null;
  const viewMode = parseViewMode(searchParams.get('view'));
  const requestedReturnTo = searchParams.get('returnTo');
  const returnTo = isSafeNextPath(requestedReturnTo)
    ? requestedReturnTo
    : `/learners/${Number.isFinite(learnerId) ? learnerId : ''}`;
  const backLabel = returnTo.startsWith('/assessments/') ? 'Back to assessment' : 'Back';

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
  const selectedScopeBlocked = !scopesLoading
    && cohortSubjectId != null
    && allowedSubjectScopes.length > 0
    && !allowedSubjectScopeIds.has(cohortSubjectId);

  const {
    report,
    loading: reportLoading,
    error: reportError,
    errorStatus: reportErrorStatus,
    refetch,
  } = useLearnerAssessmentReport(
    Number.isFinite(learnerId) && learnerId > 0 ? learnerId : null,
    {
      assessmentId,
      cohortSubjectId,
      assessmentType,
      termId,
      subjectId,
      cohortId,
      academicYearId,
    },
    { enabled: !selectedScopeBlocked },
  );

  const updateQuery = useCallback((updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (assessmentId) {
      nextParams.set('assessment', String(assessmentId));
    }
    if (returnTo) {
      nextParams.set('returnTo', returnTo);
    }
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    }
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [assessmentId, pathname, returnTo, router, searchParams]);

  if (!Number.isFinite(learnerId) || learnerId <= 0) {
    return (
      <Card>
        <p className="text-sm theme-muted">Learner report route is missing a valid learner id.</p>
      </Card>
    );
  }

  const permissionDenied = reportErrorStatus === 403;
  const showAccessState = selectedScopeBlocked || permissionDenied;
  const learner = report?.learner ?? scopes?.learner;
  const context = report?.context;
  const categoryLabel = context?.assessment_type_display ?? assessmentType ?? 'Assessment performance';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href={returnTo}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          </Link>
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="blue">{categoryLabel}</Badge>
              {context?.assessment_name ? <Badge variant="default">{context.assessment_name}</Badge> : null}
            </div>
            <h1 className="mt-3 text-2xl font-semibold theme-text">
              {learner?.name ?? 'Learner Assessment Report'}
            </h1>
            <p className="mt-1 text-sm theme-muted">
              {learner?.admission_number ?? 'Admission number unavailable'}
            </p>
          </div>
        </div>

        <ViewModeTabs
          value={viewMode}
          onChange={(nextView) => updateQuery({ view: nextView })}
        />
      </div>

      {scopesError ? (
        <AppErrorBanner error={learnerAssessmentReportError(scopesError)} />
      ) : null}

      {showAccessState ? (
        <AccessState
          learnerId={learnerId}
          scopes={allowedSubjectScopes}
          returnTo={returnTo}
          assessmentId={assessmentId}
          assessmentType={assessmentType}
          termId={termId}
        />
      ) : null}

      {!showAccessState && reportLoading && !report ? (
        <ReportPreparingState
          title="Building learner assessment report..."
          steps={[
            'Resolving reporting scope',
            'Collecting visible assessment scores',
            'Calculating category performance',
            'Preparing trends',
          ]}
          activeStep={1}
        />
      ) : null}

      {!showAccessState && reportError && !permissionDenied ? (
        <AppErrorBanner
          error={learnerAssessmentReportError(reportError)}
          onAction={() => void refetch()}
        />
      ) : null}

      {!showAccessState && report ? (
        <>
          <Card>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Assessment</p>
                <p className="mt-1 font-semibold theme-text">{context?.assessment_name ?? 'All matching assessments'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Subject</p>
                <p className="mt-1 font-semibold theme-text">
                  {context?.subject_name
                    ? `${context.subject_code ?? ''} ${context.subject_name}`.trim()
                    : 'Visible subjects'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Cohort / Term</p>
                <p className="mt-1 font-semibold theme-text">
                  {[context?.cohort_name, context?.term_name].filter(Boolean).join(' · ') || 'All periods'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Category</p>
                <p className="mt-1 font-semibold theme-text">{context?.assessment_type_display ?? 'All categories'}</p>
              </div>
            </div>
          </Card>

          <FilterControls
            report={report}
            assessmentType={assessmentType}
            cohortSubjectId={cohortSubjectId}
            termId={termId}
            academicYearId={academicYearId}
            onChange={updateQuery}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              title="Assessments"
              value={String(report.summary.assessment_count)}
              helper={`${report.summary.graded_count} graded`}
              icon={FileText}
            />
            <SummaryCard
              title="Average"
              value={metricValue(report.summary.average_percentage)}
              helper="Numeric scores only"
              icon={BarChart3}
            />
            <SummaryCard
              title="Best Score"
              value={metricValue(report.summary.best_percentage)}
              helper="Highest percentage"
              icon={Trophy}
            />
            <SummaryCard
              title="Latest Score"
              value={metricValue(report.summary.latest_percentage)}
              helper={formatDate(report.summary.latest_assessment_date)}
              icon={Clock3}
            />
            <SummaryCard
              title="Finalized"
              value={String(report.summary.finalized_count)}
              helper={`${report.summary.active_count} active`}
              icon={CheckCircle2}
            />
          </div>

          {viewMode === 'summary' ? (
            <AssessmentRowsTable rows={report.assessment_rows} />
          ) : null}

          {viewMode === 'terms' ? (
            <TermsView rows={report.term_trend} />
          ) : null}

          {viewMode === 'academic_years' ? (
            <AcademicYearsView rows={report.academic_year_trend} />
          ) : null}

          {viewMode === 'subjects' ? (
            <SubjectsView
              rows={report.subject_breakdown}
              canCompareSubjects={report.visibility.can_compare_subjects}
            />
          ) : null}
        </>
      ) : null}

      {scopesLoading && !report && !showAccessState && !reportLoading ? (
        <EntityLoadingState entity="learner assessment scopes" action="Loading" />
      ) : null}
    </div>
  );
}
