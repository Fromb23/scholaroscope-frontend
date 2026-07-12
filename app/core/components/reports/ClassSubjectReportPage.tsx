'use client';

import Link from 'next/link';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileBarChart,
  GraduationCap,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import {
  ReportPreparingState,
  SectionLoading,
} from '@/app/components/ui/loading';
import { learnerReportingAPI } from '@/app/core/api/reporting';
import {
  formatReportDate,
  formatReportPercent,
  friendlyRiskLabel,
  friendlySubjectStatusLabel,
  ReportMetricCard,
  riskTone,
  subjectStatusTone,
  toneToBadgeVariant,
} from '@/app/core/components/reports/ReportSummaryPrimitives';
import { ReportExportButtons } from '@/app/core/components/reports/ReportExportButtons';
import {
  useClassSubjectReport,
  useInstructorCohortSubjects,
} from '@/app/core/hooks/useReporting';
import { useReportExport } from '@/app/core/hooks/reports/useReportExport';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useAuth } from '@/app/context/AuthContext';
import { useClassSubjectIntelligence } from '@/app/core/hooks/useAcademicIntelligence';
import { ClassSubjectIntelligencePanel } from '@/app/core/components/reports/AcademicInsightPrimitives';
import type {
  ClassSubjectLearnerRow,
  ClassSubjectReportPayload,
} from '@/app/core/types/reporting';
import type { ClassSubjectIntelligence } from '@/app/core/types/academicIntelligence';
import type { Term } from '@/app/core/types/academic';
import type { User } from '@/app/core/types/auth';
import {
  buildAttendanceReportHref,
  buildCbcCohortProgressHref,
  buildCbcLearnerProgressHref,
  buildLearnerReportHref,
  buildLearnerSubjectReportHref,
  buildReportReturnTo,
  buildInstructorCohortSubjectDetailHref,
  parsePositiveReportParam,
  resolveReportBackHref,
} from './reportNavigation';

function getLearnerSummaryNote(row: ClassSubjectLearnerRow): string {
  return row.summary_note || row.note || 'No summary note yet.';
}

function getLearnerSupportSignal(row: ClassSubjectLearnerRow): string | null {
  const primaryWeakArea = row.weak_areas[0];
  if (!primaryWeakArea) {
    return null;
  }

  const detail = primaryWeakArea.metric?.trim();
  if (detail && detail !== primaryWeakArea.label) {
    return `${primaryWeakArea.label}: ${detail}`;
  }

  return primaryWeakArea.label || detail || null;
}

function formatLearnerCount(count: number): string {
  return `${count} learner${count === 1 ? '' : 's'}`;
}

function displayUserName(user: User | null): string | null {
  if (!user) {
    return null;
  }

  return user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email || null;
}

function buildScopedOperationsHref(
  basePath: string,
  params: Record<string, number | string | null | undefined>,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function resolveClassSubjectReportTermLabel({
  selectedTermId,
  report,
  intelligence,
  terms,
}: {
  selectedTermId: number | null;
  report?: Pick<ClassSubjectReportPayload, 'period'> | null;
  intelligence?: Pick<ClassSubjectIntelligence, 'scope'> | null;
  terms?: Array<Pick<Term, 'id' | 'name'>>;
}): string {
  if (report?.period?.term_id && report.period.label) {
    return report.period.label;
  }

  if (
    selectedTermId
    && intelligence?.scope.term_id === selectedTermId
    && intelligence.scope.term_name
  ) {
    return intelligence.scope.term_name;
  }

  if (selectedTermId) {
    const termName = terms?.find((term) => term.id === selectedTermId)?.name;
    if (termName) {
      return termName;
    }
  }

  return report?.period?.label || 'All recorded data';
}

export function ClassSubjectReportHeaderContext({
  isInstructorRoute,
  assignedInstructor,
  viewerName,
  periodLabel,
  generatedAt,
}: {
  isInstructorRoute: boolean;
  assignedInstructor?: ClassSubjectReportPayload['instructor'];
  viewerName?: string | null;
  periodLabel: string;
  generatedAt: string;
}) {
  return (
    <div className="mt-4 space-y-1 text-sm theme-muted">
      {isInstructorRoute ? (
        <p>{viewerName ? `Viewing as ${viewerName}` : 'Your class subject workspace'}</p>
      ) : null}
      {assignedInstructor ? (
        <p>
          Assigned instructor: {assignedInstructor.name}
          {assignedInstructor.email ? ` · ${assignedInstructor.email}` : ''}
        </p>
      ) : !isInstructorRoute ? (
        <p>No formal instructor assignment recorded</p>
      ) : null}
      <p>{periodLabel}</p>
      <p>Generated {formatReportDate(generatedAt)}</p>
    </div>
  );
}

function LearnerReportLinks({
  learnerSubjectHref,
  learnerReportHref,
  cbcProgressHref,
}: {
  learnerSubjectHref: string;
  learnerReportHref?: string | null;
  cbcProgressHref?: string | null;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Link href={learnerSubjectHref}>
        <Button variant="secondary" size="sm">Learner Subject</Button>
      </Link>
      {learnerReportHref ? (
        <Link href={learnerReportHref}>
          <Button variant="ghost" size="sm">Learner Report</Button>
        </Link>
      ) : null}
      {cbcProgressHref ? (
        <Link href={cbcProgressHref}>
          <Button variant="ghost" size="sm">CBC Progress</Button>
        </Link>
      ) : null}
    </div>
  );
}

function LearnerRowsList({
  title,
  description,
  rows,
  emptyMessage,
  tone,
  renderLinks,
}: {
  title: string;
  description: string;
  rows: ClassSubjectLearnerRow[];
  emptyMessage: string;
  tone: 'support' | 'track';
  renderLinks?: (row: ClassSubjectLearnerRow) => ReactNode;
}) {
  const countVariant = tone === 'support' ? 'warning' : 'success';
  const cardClassName = tone === 'support'
    ? 'border border-amber-200 theme-warning-surface p-5'
    : 'border theme-border p-5';

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold theme-text">{title}</h2>
          <p className="mt-1 text-sm theme-muted">{description}</p>
        </div>
        <Badge variant={countVariant}>{formatLearnerCount(rows.length)}</Badge>
      </div>

      {rows.length === 0 ? (
        <Card className={cardClassName}>
          <p className="text-sm theme-muted">{emptyMessage}</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => {
            const supportSignal = getLearnerSupportSignal(row);
            return (
              <Card key={row.learner.id} className={cardClassName}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold theme-text">{row.learner.name}</h3>
                    <p className="mt-1 text-sm theme-subtle">
                      Admission No. {row.learner.admission_number}
                    </p>
                  </div>
                  <Badge variant={toneToBadgeVariant(subjectStatusTone(row.summary_status))}>
                    {friendlySubjectStatusLabel(row.summary_status)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/70 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide theme-subtle">Attendance</p>
                    <p className="mt-1 text-sm font-semibold theme-text">
                      {formatReportPercent(row.attendance_rate)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide theme-subtle">Assignments</p>
                    <p className="mt-1 text-sm font-semibold theme-text">
                      {formatReportPercent(row.assignment_completion_rate)}
                    </p>
                  </div>
                </div>

                {tone === 'support' && supportSignal ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-white/70 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-amber-800">Support signal</p>
                    <p className="mt-1 text-sm font-medium text-amber-900 line-clamp-2">
                      {supportSignal}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide theme-subtle">Note</p>
                  <p className="mt-1 text-sm theme-muted line-clamp-2">
                    {getLearnerSummaryNote(row)}
                  </p>
                </div>

                {renderLinks ? renderLinks(row) : null}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FullLearnerSummaryContent({ rows }: { rows: ClassSubjectLearnerRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm theme-muted">
        No learner rows are available for this subject yet.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-3 lg:hidden">
        {rows.map((row) => (
          <Card key={`summary-${row.learner.id}`} className="border theme-border p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold theme-text">{row.learner.name}</h3>
                  <p className="mt-1 text-xs theme-subtle">{row.learner.admission_number}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={toneToBadgeVariant(riskTone(row.risk_level))}>
                    {friendlyRiskLabel(row.risk_level)}
                  </Badge>
                  <Badge variant={toneToBadgeVariant(subjectStatusTone(row.summary_status))}>
                    {friendlySubjectStatusLabel(row.summary_status)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide theme-subtle">Attendance</p>
                  <p className="mt-1 text-sm font-medium theme-text">
                    {formatReportPercent(row.attendance_rate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide theme-subtle">Assignments</p>
                  <p className="mt-1 text-sm font-medium theme-text">
                    {formatReportPercent(row.assignment_completion_rate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide theme-subtle">Evidence</p>
                  <p className="mt-1 text-sm font-medium theme-text">{row.evidence_count}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide theme-subtle">Mastery</p>
                  <p className="mt-1 text-sm font-medium theme-text">
                    {formatReportPercent(row.mastery_percentage)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide theme-subtle">Note</p>
                <p className="mt-1 text-sm theme-muted">{getLearnerSummaryNote(row)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
              <th className="px-3 py-2">Learner</th>
              <th className="px-3 py-2">Risk</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Attendance</th>
              <th className="px-3 py-2 text-right">Assignments</th>
              <th className="px-3 py-2 text-right">Evidence</th>
              <th className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.learner.id} className="border-b theme-border align-top">
                <td className="px-3 py-3">
                  <div className="font-medium theme-text">{row.learner.name}</div>
                  <div className="text-xs theme-subtle">{row.learner.admission_number}</div>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={toneToBadgeVariant(riskTone(row.risk_level))}>
                    {friendlyRiskLabel(row.risk_level)}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={toneToBadgeVariant(subjectStatusTone(row.summary_status))}>
                    {friendlySubjectStatusLabel(row.summary_status)}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-right theme-muted">
                  {formatReportPercent(row.attendance_rate)}
                </td>
                <td className="px-3 py-3 text-right theme-muted">
                  {formatReportPercent(row.assignment_completion_rate)}
                </td>
                <td className="px-3 py-3 text-right theme-muted">{row.evidence_count}</td>
                <td className="px-3 py-3 theme-muted">{getLearnerSummaryNote(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ClassSubjectReportPage({
  cohortIdOverride = null,
  fallbackReturnTo,
}: {
  cohortIdOverride?: number | null;
  fallbackReturnTo?: string;
} = {}) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const cohortSubjectId = Number(params.id);
  const selectedTermId = parsePositiveReportParam(searchParams.get('term'));
  const currentReturnTo = buildReportReturnTo(pathname, searchParams.toString());
  const isInstructorRoute = pathname.startsWith('/reports/instructor/');
  const returnTo = resolveReportBackHref({
    returnTo: searchParams.get('returnTo'),
    fallbackHref: fallbackReturnTo
      ?? buildInstructorCohortSubjectDetailHref(cohortSubjectId, selectedTermId),
  });
  const selectedCohortId = parsePositiveReportParam(
    searchParams.get('cohort') ?? searchParams.get('cohort_id'),
  );

  const {
    cohortSubjects,
    loading: cohortSubjectsLoading,
    error: cohortSubjectsError,
  } = useInstructorCohortSubjects({ enabled: cohortIdOverride == null });

  const cohortSubjectMeta = useMemo(
    () => cohortSubjects.find((item) => item.id === cohortSubjectId) ?? null,
    [cohortSubjectId, cohortSubjects],
  );
  const cohortId = selectedCohortId ?? cohortIdOverride ?? cohortSubjectMeta?.cohort_id ?? null;

  const {
    report,
    loading,
    error,
  } = useClassSubjectReport(cohortId, cohortSubjectId, {
    enabled: Boolean(cohortId && cohortSubjectId && selectedTermId),
    termId: selectedTermId,
  });
  const {
    intelligence: classIntelligence,
    loading: classIntelligenceLoading,
    error: classIntelligenceError,
    refetch: refetchClassIntelligence,
  } = useClassSubjectIntelligence(
    Number.isFinite(cohortSubjectId) && cohortSubjectId > 0 ? cohortSubjectId : null,
    { enabled: Boolean(cohortSubjectId && selectedTermId), termId: selectedTermId },
  );
  const { terms } = useTerms();

  const [fullSummaryOpen, setFullSummaryOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  const { handleExport, exporting } = useReportExport(async (format) => {
    if (!cohortId) {
      throw new Error('Open a class subject report before exporting.');
    }

    return learnerReportingAPI.exportClassSubjectReport(cohortId, {
      format,
      cohortSubjectId,
      termId: selectedTermId,
    });
  }, 'class subject report');

  const visibleError = error ?? (cohortIdOverride == null ? cohortSubjectsError : null) ?? null;
  const reportSubjectName = report?.subject.name ?? cohortSubjectMeta?.subject_name ?? 'Class subject';
  const reportSubjectCode = report?.subject.code ?? cohortSubjectMeta?.subject_code ?? null;
  const reportCohortName = report?.cohort.name ?? cohortSubjectMeta?.cohort_name ?? null;
  const viewerName = displayUserName(user);
  const reportPeriodLabel = resolveClassSubjectReportTermLabel({
    selectedTermId,
    report,
    intelligence: classIntelligence,
    terms,
  });
  const hasCbcProgress = Boolean(
    report?.reporting_source === 'cbc'
    || report?.composition?.available_sections?.includes('cbc_progress'),
  );
  const classSubjectActions = report ? [
    {
      label: 'Attendance',
      href: buildAttendanceReportHref({
        term: selectedTermId ?? report.period?.term_id ?? null,
        cohort: report.cohort.id,
        subject: report.subject.id,
        cohortSubject: report.cohort_subject.id,
        returnTo: currentReturnTo,
      }),
      variant: 'secondary' as const,
    },
    ...(hasCbcProgress ? [{
      label: 'CBC Progress',
      href: buildCbcCohortProgressHref(report.cohort.id, {
        subject: report.subject.id,
        cohortSubject: report.cohort_subject.id,
        returnTo: currentReturnTo,
      }),
      variant: 'secondary' as const,
    }] : []),
    {
      label: 'Assignments',
      href: buildScopedOperationsHref('/assignments', {
        term: selectedTermId ?? report.period?.term_id ?? null,
        cohort_subject: report.cohort_subject.id,
        cohort: report.cohort.id,
        subject: report.subject.id,
        returnTo: currentReturnTo,
      }),
      variant: 'ghost' as const,
    },
    {
      label: 'Sessions',
      href: buildScopedOperationsHref('/sessions', {
        term: selectedTermId ?? report.period?.term_id ?? null,
        cohort_subject: report.cohort_subject.id,
        cohort: report.cohort.id,
        subject: report.subject.id,
        returnTo: currentReturnTo,
      }),
      variant: 'ghost' as const,
    },
    {
      label: 'Assessments',
      href: buildScopedOperationsHref('/assessments', {
        term: selectedTermId ?? report.period?.term_id ?? null,
        cohort_subject: report.cohort_subject.id,
        cohort: report.cohort.id,
        subject: report.subject.id,
        returnTo: currentReturnTo,
      }),
      variant: 'ghost' as const,
    },
  ] : [];
  const renderLearnerLinks = useCallback((row: ClassSubjectLearnerRow) => {
    if (!report) {
      return null;
    }

    const learnerSubjectHref = buildLearnerSubjectReportHref(
      row.learner.id,
      report.cohort_subject.id,
      { returnTo: currentReturnTo },
    );
    const learnerReportHref = isInstructorRoute
      ? null
      : buildLearnerReportHref(row.learner.id, {
          cohort: report.cohort.id,
          subject: report.subject.id,
          cohortSubject: report.cohort_subject.id,
          returnTo: currentReturnTo,
        });
    const cbcProgressHref = hasCbcProgress
      ? buildCbcLearnerProgressHref(row.learner.id, {
          subject: report.subject.id,
          cohortSubject: report.cohort_subject.id,
          returnTo: currentReturnTo,
        })
      : null;

    return (
      <LearnerReportLinks
        learnerSubjectHref={learnerSubjectHref}
        learnerReportHref={learnerReportHref}
        cbcProgressHref={cbcProgressHref}
      />
    );
  }, [currentReturnTo, hasCbcProgress, isInstructorRoute, report]);

  if (cohortSubjectsLoading && cohortIdOverride == null && !cohortSubjectMeta) {
    return (
      <ReportPreparingState
        title="Loading class subject report context..."
        steps={['Resolving class subject', 'Checking report access', 'Preparing report filters']}
        activeStep={1}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link href={returnTo}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Subject Workspace
          </Button>
        </Link>

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="theme-info-surface flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold theme-text">Class Subject Report</h1>
                <p className="mt-1 text-sm theme-muted">
                  A printable class view that highlights response, support needs, and next teaching actions.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="info">{reportSubjectName}</Badge>
                  {reportSubjectCode ? <Badge variant="default">{reportSubjectCode}</Badge> : null}
                  {reportCohortName ? <Badge variant="default">{reportCohortName}</Badge> : null}
                </div>

                {report ? (
                  <ClassSubjectReportHeaderContext
                    isInstructorRoute={isInstructorRoute}
                    assignedInstructor={report.instructor}
                    viewerName={viewerName}
                    periodLabel={reportPeriodLabel}
                    generatedAt={report.generated_at}
                  />
                ) : null}
              </div>
            </div>

            <ReportExportButtons
              reportType="class_subject"
              exporting={exporting}
              disabled={!report}
              onExport={handleExport}
              className="w-full sm:w-auto xl:justify-end"
            />
          </div>
        </Card>
      </div>

      {visibleError ? (
        <ErrorBanner message={visibleError} onDismiss={() => undefined} />
      ) : null}

      {!selectedTermId ? (
        <Card className="p-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold theme-text">Select a term to view class intelligence</h2>
            <p className="text-sm theme-muted">
              This instructor class report is term-scoped. Choose a term in the subject workspace, then reopen the class report.
            </p>
          </div>
        </Card>
      ) : null}

      {selectedTermId && loading ? (
        <ReportPreparingState
          title="Building class subject report..."
          steps={[
            'Collecting class subject roster',
            'Reading attendance and assignment signals',
            'Calculating learning and participation risk',
            'Preparing recommendations',
          ]}
          activeStep={1}
        />
      ) : null}

      {selectedTermId && report && !loading ? (
        <>
          {classIntelligenceLoading ? (
            <SectionLoading title="Loading class academic intelligence..." />
          ) : classIntelligenceError ? (
            <ErrorBanner
              message={classIntelligenceError}
              onDismiss={() => void refetchClassIntelligence()}
            />
          ) : classIntelligence ? (
            <ClassSubjectIntelligencePanel intelligence={classIntelligence} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportMetricCard
              label="Learners"
              value={report.learner_count}
              note="Learners in report"
              tone={report.learner_count > 0 ? 'success' : 'neutral'}
            />
            <ReportMetricCard
              label="Attendance"
              value={formatReportPercent(report.attendance_trend.attendance_rate)}
              note="Attendance response"
              tone={report.attendance_trend.attendance_rate != null && report.attendance_trend.attendance_rate >= 75 ? 'success' : 'warning'}
            />
            <ReportMetricCard
              label="Assignments"
              value={formatReportPercent(report.assignment_summary.assignment_completion_rate)}
              note="Assignment completion"
              tone={report.assignment_summary.assignment_completion_rate != null && report.assignment_summary.assignment_completion_rate >= 70 ? 'success' : 'warning'}
            />
            <ReportMetricCard
              label="Mastery"
              value={formatReportPercent(report.progress.mastery_percentage)}
              note="Mastery signal"
              tone={report.progress.mastery_percentage != null && report.progress.mastery_percentage >= 70 ? 'success' : 'warning'}
            />
            <ReportMetricCard
              label="Evidence"
              value={report.progress.evidence_count}
              note="Evidence records"
              tone={report.progress.evidence_count > 0 ? 'success' : 'warning'}
            />
          </div>

          <Card className="border theme-border p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold theme-text">Context Drill-Down</h2>
                <p className="mt-1 text-sm theme-muted">
                  Class-subject actions for this cohort subject. Mobile keeps these behind
                  disclosure so the summary stays readable.
                </p>
              </div>
              <div className="md:hidden">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMobileActionsOpen((current) => !current)}
                >
                  {mobileActionsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {mobileActionsOpen ? 'Show less' : 'Show more'}
                </Button>
                {mobileActionsOpen ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {classSubjectActions.map((item) => (
                      <Link key={item.label} href={item.href}>
                        <Button variant={item.variant} size="sm">{item.label}</Button>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="hidden flex-wrap gap-2 md:flex">
                {classSubjectActions.map((item) => (
                  <Link key={item.label} href={item.href}>
                    <Button variant={item.variant} size="sm">{item.label}</Button>
                  </Link>
                ))}
              </div>
            </div>
          </Card>

          <LearnerRowsList
            title="Learners Needing Support"
            description="Prioritize these learners first when planning follow-up support."
            rows={report.learners_needing_support}
            emptyMessage="No learners are currently flagged for support in this subject."
            tone="support"
            renderLinks={renderLearnerLinks}
          />

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-lg font-semibold theme-text">Recommended Teaching Interventions</h2>
                <p className="mt-1 text-sm theme-muted">
                  Actionable next steps surfaced before the detailed learner breakdown.
                </p>
              </div>
            </div>

            {report.recommended_teaching_interventions.length === 0 ? (
              <Card className="border border-amber-200 theme-warning-surface p-5">
                <p className="text-sm theme-muted">No teaching interventions are recommended yet.</p>
              </Card>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {report.recommended_teaching_interventions.map((item, index) => (
                  <Card
                    key={item}
                    className="border border-amber-200 theme-warning-surface p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-amber-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold theme-text">Teaching action {index + 1}</p>
                        <p className="mt-1 text-sm theme-text">{item}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <Card>
            <div className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5 theme-subtle" />
              <h2 className="text-lg font-semibold theme-text">Class Response</h2>
            </div>
            <p className="mt-4 text-sm theme-muted">
              {report.class_response_summary || 'No class response summary is available yet.'}
            </p>
          </Card>

          <section className="space-y-6">
            <LearnerRowsList
              title="Learners On Track"
              description="These learners are responding steadily and need lighter monitoring."
              rows={report.learners_on_track}
              emptyMessage="No learners are currently on track in this subject yet."
              tone="track"
              renderLinks={renderLearnerLinks}
            />

            {report.learners_exceeding_expectation.length > 0 ? (
              <Card className="border theme-border p-5 theme-info-surface">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-700" />
                  <div>
                    <h3 className="text-base font-semibold theme-text">Learners Exceeding Expectation</h3>
                    <p className="mt-1 text-sm theme-muted">
                      Strong performers worth using for peer modelling or extension work.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {report.learners_exceeding_expectation.map((row) => (
                    <div
                      key={`exceeding-${row.learner.id}`}
                      className="rounded-lg border border-blue-200 bg-white/70 px-4 py-3"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold theme-text">{row.learner.name}</p>
                          <p className="mt-1 text-xs theme-subtle">
                            {row.learner.admission_number}
                          </p>
                        </div>
                        <Badge variant={toneToBadgeVariant(subjectStatusTone(row.summary_status))}>
                          {friendlySubjectStatusLabel(row.summary_status)}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm theme-muted line-clamp-2">
                        {getLearnerSummaryNote(row)}
                      </p>
                      {renderLearnerLinks(row)}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </section>

          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold theme-text">Full Learner Summary</h2>
                <p className="mt-1 text-sm theme-muted">
                  Expand only when you need the complete learner-by-learner detail.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setFullSummaryOpen((current) => !current)}
              >
                {fullSummaryOpen ? 'Hide full learner summary' : 'View full learner summary'}
                {fullSummaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {fullSummaryOpen ? (
              <FullLearnerSummaryContent rows={report.learner_rows} />
            ) : (
              <p className="mt-4 text-sm theme-muted">
                This section stays collapsed by default so the report opens with the class summary and action areas first.
              </p>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
