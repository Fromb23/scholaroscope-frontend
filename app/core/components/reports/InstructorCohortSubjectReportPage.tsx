'use client';

import Link from 'next/link';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from 'react';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  FileBarChart,
  Users,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { AssessmentCompletionSummary } from '@/app/core/components/reports/AssessmentCompletionSummary';
import { CbcPerformanceSummary } from '@/app/core/components/reports/CbcPerformanceSummary';
import { CurriculumSubjectReportCard } from '@/app/core/components/reports/CurriculumSubjectReportCard';
import { GenericPerformanceSummary } from '@/app/core/components/reports/GenericPerformanceSummary';
import { ReportingSourceState } from '@/app/core/components/reports/ReportingSourceState';
import {
  CompactReportGrid,
  CompactStatsGrid,
  ReportPageShell,
} from '@/app/core/components/reports/ReportLayouts';
import {
  useInstructorCohortSubjectLearners,
  useInstructorCohortSubjectPerformance,
  useInstructorCohortSubjectTeachingActivity,
  useInstructorCohortSubjects,
} from '@/app/core/hooks/useReporting';
import { useCurrentTerm, useTerms } from '@/app/core/hooks/useAcademic';
import {
  countMapFromItems,
  formatPercent,
  getAssessmentCompletionRatio,
  getCurriculumTypeLabel,
  getReportingSourceLabel,
  getReportingSourceVariant,
  getReportingStatusLabel,
  resolveCbcStudentResult,
  toCbcPerformance,
  toGenericPerformance,
} from '@/app/core/lib/reportingPresentation';
import type {
  GenericPerformance,
  GenericStudentSection,
  InstructorLearnerReportRow,
  ReportingSource,
} from '@/app/core/types/reporting';
import type { ExportPayload } from '@/app/types/export';
import {
  buildInstructorClassReportHref,
  buildInstructorCohortSubjectDetailHref,
  parsePositiveReportParam,
  resolveReportBackHref,
} from '@/app/core/components/reports/reportNavigation';

type DetailTab = 'learners' | 'performance' | 'teaching-activity';

const TABS: Array<{ id: DetailTab; label: string; icon: ElementType }> = [
  { id: 'learners', label: 'Learners', icon: Users },
  { id: 'performance', label: 'Class Results', icon: FileBarChart },
  { id: 'teaching-activity', label: 'Teaching Progress', icon: Activity },
];
const EMPTY_LEARNERS: InstructorLearnerReportRow[] = [];

function isDetailTab(value: string | null): value is DetailTab {
  return value === 'learners' || value === 'performance' || value === 'teaching-activity';
}

function resolveInstructorGenericStudent(item: InstructorLearnerReportRow): GenericStudentSection | null {
  if (item.generic) return item.generic;
  if (item.generic_result) return item.generic_result;
  if (!item.computed_grade && !item.grade_summary) return null;

  return {
    final_score: item.computed_grade?.final_score ?? null,
    average_score: item.grade_summary?.average_score ?? null,
    weighted_average: item.grade_summary?.weighted_average ?? null,
    letter_grade: item.computed_grade?.letter_grade ?? item.grade_summary?.final_grade ?? null,
    letter_label: item.computed_grade?.letter_label ?? null,
    grade_status: item.computed_grade?.grade_status ?? null,
    grade_summary: item.grade_summary ?? null,
  };
}

function resolveInstructorCbcStudent(item: InstructorLearnerReportRow) {
  return item.cbc ?? item.cbc_result ?? null;
}

function buildGenericPerformanceFallback(
  report: ReturnType<typeof useInstructorCohortSubjectPerformance>['report'],
): GenericPerformance | null {
  if (!report) return null;
  if (report.generic_performance || report.generic_summary) {
    return toGenericPerformance(report.generic_performance ?? report.generic_summary);
  }
  if (report.reporting_source && report.reporting_source !== 'generic') {
    return null;
  }

  const gradeDistribution = report.grade_distribution ?? [];
  const gradeStatusCounts = report.grade_status_counts ?? [];
  const assessmentBreakdown = report.assessment_type_breakdown ?? [];

  if (
    report.average_score == null
    && report.highest_score == null
    && report.lowest_score == null
    && gradeDistribution.length === 0
    && gradeStatusCounts.length === 0
    && assessmentBreakdown.length === 0
  ) {
    return null;
  }

  return {
    average_score: report.average_score,
    highest_score: report.highest_score,
    lowest_score: report.lowest_score,
    computed_count: report.total_learners,
    distribution_by_letter: countMapFromItems(gradeDistribution, 'letter_grade'),
    grade_status_counts: countMapFromItems(gradeStatusCounts, 'grade_status'),
    assessment_type_breakdown: assessmentBreakdown,
  };
}

export default function InstructorCohortSubjectDetailReportPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const cohortSubjectId = Number(params.id);
  const isValidCohortSubjectId = Number.isFinite(cohortSubjectId) && cohortSubjectId > 0;
  const activeTab: DetailTab = isDetailTab(tabParam) ? tabParam : 'learners';
  const selectedTerm = parsePositiveReportParam(searchParams.get('term'));
  const { currentTerm, loading: currentTermLoading } = useCurrentTerm();
  const effectiveTermId = selectedTerm ?? currentTerm?.id ?? null;
  const workspaceReturnTo = buildInstructorCohortSubjectDetailHref(cohortSubjectId, effectiveTermId);
  const backHref = resolveReportBackHref({
    returnTo: searchParams.get('returnTo'),
    fallbackHref: '/reports/instructor/cohort-subjects',
    fallbackState: { term: effectiveTermId },
  });

  const [exportOpen, setExportOpen] = useState(false);

  const updateSearchParams = useCallback((updates: {
    tab?: DetailTab;
    term?: number | null;
  }) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (updates.tab !== undefined) {
      nextParams.set('tab', updates.tab);
    }

    if (updates.term !== undefined) {
      if (updates.term) {
        nextParams.set('term', String(updates.term));
      } else {
        nextParams.delete('term');
      }
    }

    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const { terms, loading: termsLoading } = useTerms();
  useEffect(() => {
    if (selectedTerm || currentTermLoading) {
      return;
    }
    if (currentTerm?.id) {
      updateSearchParams({ term: currentTerm.id });
    }
  }, [currentTerm?.id, currentTermLoading, selectedTerm, updateSearchParams]);

  const {
    cohortSubjects,
    loading: cohortSubjectsLoading,
    error: cohortSubjectsError,
  } = useInstructorCohortSubjects();

  const learnersQuery = useInstructorCohortSubjectLearners(
    isValidCohortSubjectId ? cohortSubjectId : null,
    effectiveTermId,
    { enabled: activeTab === 'learners' && isValidCohortSubjectId && Boolean(effectiveTermId) },
  );
  const performanceQuery = useInstructorCohortSubjectPerformance(
    isValidCohortSubjectId ? cohortSubjectId : null,
    effectiveTermId,
    { enabled: activeTab === 'performance' && isValidCohortSubjectId && Boolean(effectiveTermId) },
  );
  const teachingActivityQuery = useInstructorCohortSubjectTeachingActivity(
    isValidCohortSubjectId ? cohortSubjectId : null,
    effectiveTermId,
    { enabled: activeTab === 'teaching-activity' && isValidCohortSubjectId && Boolean(effectiveTermId) },
  );

  const activeQuery = activeTab === 'learners'
    ? learnersQuery
    : activeTab === 'performance'
      ? performanceQuery
      : teachingActivityQuery;

  const cohortSubjectMeta = cohortSubjects.find((item) => item.id === cohortSubjectId) ?? null;
  const reportMeta = activeQuery.report
    ?? learnersQuery.report
    ?? performanceQuery.report
    ?? teachingActivityQuery.report
    ?? null;
  const classReportHref = effectiveTermId
    ? buildInstructorClassReportHref(cohortSubjectId, effectiveTermId, {
        cohortId: cohortSubjectMeta?.cohort_id ?? null,
        returnTo: workspaceReturnTo,
      })
    : null;

  const learners = learnersQuery.report?.learners ?? EMPTY_LEARNERS;
  const termLabel = effectiveTermId
    ? terms.find((term) => term.id === effectiveTermId)?.name
      ?? currentTerm?.name
      ?? `Term ${effectiveTermId}`
    : 'Select a term';

  const pageTitle = cohortSubjectMeta
    ? `${cohortSubjectMeta.cohort_name} — ${cohortSubjectMeta.subject_name}`
    : reportMeta?.cohort_subject
      ? `${reportMeta.cohort_subject.cohort_name ?? 'Class'} — ${reportMeta.cohort_subject.subject_name}`
      : `Class Subject #${cohortSubjectId}`;

  const reportingSource = (reportMeta?.reporting_source ?? cohortSubjectMeta?.reporting_source ?? 'unsupported') as ReportingSource;
  const curriculumType = getCurriculumTypeLabel(reportMeta?.curriculum_type ?? cohortSubjectMeta?.curriculum_type ?? null);
  const status = reportMeta?.status ?? cohortSubjectMeta?.status ?? null;
  const note = reportMeta?.note ?? cohortSubjectMeta?.note ?? null;

  const genericPerformance = reportingSource === 'generic'
    ? buildGenericPerformanceFallback(performanceQuery.report)
    : null;
  const cbcPerformance = reportingSource === 'cbc'
    ? toCbcPerformance(
        performanceQuery.report?.cbc_performance ?? performanceQuery.report?.cbc_summary,
      )
    : null;

  const exportPayload = useMemo<ExportPayload | null>(() => {
    if (!isValidCohortSubjectId) return null;

    if (activeTab === 'learners' && learnersQuery.report) {
      return {
        title: `${pageTitle} Class Learners`,
        subtitle: termLabel,
        metadata: {
          generatedAt: new Date().toLocaleString(),
        },
        columns: [
          { key: 'student_name', label: 'Learner', width: 24 },
          { key: 'admission_number', label: 'Admission No.', width: 14 },
          { key: 'report_type', label: 'Report Type', width: 18 },
          { key: 'status', label: 'Status', width: 16 },
          { key: 'attendance', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
          { key: 'mark', label: 'Mark', format: 'percentage', width: 14, align: 'right' as const },
          { key: 'cbc_weighted_score', label: 'CBC Weighted Score', format: 'percentage', width: 18, align: 'right' as const },
          { key: 'cbc_code', label: 'CBC Code', width: 12 },
          { key: 'assessments', label: 'Completed Assessments', width: 22 },
        ],
        rows: learners.map((item) => {
          const genericResult = resolveInstructorGenericStudent(item);
          const cbcStudent = resolveInstructorCbcStudent(item);
          const cbcResult = resolveCbcStudentResult(cbcStudent);
          return {
            student_name: item.student.name,
            admission_number: item.student.admission_number,
            report_type: getReportingSourceLabel(item.reporting_source),
            status: getReportingStatusLabel(item.status)
              ?? genericResult?.grade_status
              ?? cbcResult?.result_status
              ?? '—',
            attendance: item.attendance_summary?.average ?? null,
            mark: genericResult?.final_score ?? genericResult?.average_score ?? genericResult?.weighted_average ?? null,
            cbc_weighted_score: cbcResult?.weighted_score ?? null,
            cbc_code: cbcResult?.cbc_code ?? '—',
            assessments: `${item.assessment_completion.completed_scores ?? item.assessment_completion.finalized_assessments}/${item.assessment_completion.total_assessments}`,
          };
        }),
        fileName: `class-learners-${cohortSubjectId}`,
        includeMetadata: true,
        includeTimestamp: true,
        sheetName: 'Class Learners',
        freezeHeader: true,
        autoFilter: true,
        orientation: 'landscape' as const,
      };
    }

    if (activeTab === 'performance' && performanceQuery.report) {
      const rows = genericPerformance
        ? [
            ...Object.entries(genericPerformance.distribution_by_letter ?? {}).map(([label, count]) => ({
              section: 'Marks Distribution',
              label,
              count,
              score: null,
            })),
            ...Object.entries(genericPerformance.grade_status_counts ?? {}).map(([label, count]) => ({
              section: 'Result Status',
              label,
              count,
              score: null,
            })),
            ...(genericPerformance.assessment_type_breakdown ?? []).map((item) => ({
              section: 'Assessment Type',
              label: item.assessment_type,
              count: item.total_assessments,
              score: item.average_score,
            })),
          ]
        : cbcPerformance
          ? [
              ...Object.entries(cbcPerformance.result_counts ?? {}).map(([label, count]) => ({
                section: 'CBC Result Status',
                label,
                count,
                score: null,
              })),
              ...Object.entries(cbcPerformance.distribution_by_code ?? {}).map(([label, count]) => ({
                section: 'CBC Code',
                label,
                count,
                score: null,
              })),
            ]
          : [];

      return {
        title: `${pageTitle} Class Results`,
        subtitle: termLabel,
        metadata: {
          reportType: getReportingSourceLabel(reportingSource),
          generatedAt: new Date().toLocaleString(),
        },
        columns: [
          { key: 'section', label: 'Section', width: 20 },
          { key: 'label', label: 'Label', width: 24 },
          { key: 'count', label: 'Count', format: 'number', width: 12, align: 'right' as const },
          { key: 'score', label: 'Average Score', format: 'percentage', width: 16, align: 'right' as const },
        ],
        rows,
        fileName: `class-results-${cohortSubjectId}`,
        includeMetadata: true,
        includeTimestamp: true,
        sheetName: 'Class Results',
        freezeHeader: true,
        autoFilter: true,
        orientation: 'landscape' as const,
      };
    }

    if (activeTab === 'teaching-activity' && teachingActivityQuery.report) {
      return {
        title: `${pageTitle} Teaching Progress`,
        subtitle: termLabel,
        metadata: {
          generatedAt: new Date().toLocaleString(),
        },
        columns: [
          { key: 'sessions_created', label: 'Lessons Planned', format: 'number', width: 16, align: 'right' as const },
          { key: 'sessions_completed', label: 'Lessons Completed', format: 'number', width: 18, align: 'right' as const },
          { key: 'attendance_marked', label: 'Attendance Marked', format: 'number', width: 18, align: 'right' as const },
          { key: 'attendance_expected', label: 'Attendance Expected', format: 'number', width: 18, align: 'right' as const },
          { key: 'attendance_completeness', label: 'Attendance Completeness', format: 'percentage', width: 20, align: 'right' as const },
        ],
        rows: [{
          sessions_created: teachingActivityQuery.report.sessions_created,
          sessions_completed: teachingActivityQuery.report.sessions_completed,
          attendance_marked: teachingActivityQuery.report.attendance_marked,
          attendance_expected: teachingActivityQuery.report.attendance_expected,
          attendance_completeness: teachingActivityQuery.report.attendance_completeness,
        }],
        fileName: `teaching-progress-${cohortSubjectId}`,
        includeMetadata: true,
        includeTimestamp: true,
        sheetName: 'Teaching Progress',
        freezeHeader: true,
        autoFilter: true,
        orientation: 'landscape' as const,
      };
    }

    return null;
  }, [
    activeTab,
    cbcPerformance,
    cohortSubjectId,
    genericPerformance,
    isValidCohortSubjectId,
    learners,
    learnersQuery.report,
    pageTitle,
    performanceQuery.report,
    reportingSource,
    teachingActivityQuery.report,
    termLabel,
  ]);

  if (!isValidCohortSubjectId) {
    return <ErrorState message="This class subject could not be found." fullScreen={false} />;
  }

  if (cohortSubjectsLoading && !cohortSubjectMeta && !reportMeta && activeQuery.loading) {
    return <LoadingSpinner message="Loading instructor class subject report..." />;
  }

  if (cohortSubjectsError && !cohortSubjectMeta && !reportMeta && !activeQuery.loading) {
    return <ErrorState message="We could not load this class view. Try reloading." fullScreen={false} />;
  }

  return (
    <ReportPageShell>
      <div className="space-y-3">
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">{pageTitle}</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Your class view for learners, marks, attendance, and teaching progress.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {exportPayload && (
              <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                <Download className="mr-1.5 h-4 w-4" />
                Export
              </Button>
            )}
            <FileBarChart className="h-7 w-7 text-green-600" />
          </div>
        </div>
      </div>

      <Card className="border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <FileBarChart className="h-4 w-4" />
              <span>Class Subject Report</span>
            </div>
            <p className="text-sm text-emerald-900/80">
              Printable class summary with learner support needs, response trends, and term-scoped academic intelligence.
            </p>
            {!effectiveTermId ? (
              <p className="text-sm text-emerald-900/80">
                Select a term to view class intelligence.
              </p>
            ) : null}
          </div>
          {classReportHref ? (
            <Link
              href={classReportHref}
              className="theme-focus-ring theme-button-primary inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors lg:w-auto"
            >
              <BookOpen className="h-4 w-4" />
              Open Class Report
            </Link>
          ) : (
            <Button variant="secondary" size="sm" disabled className="w-full lg:w-auto">
              <BookOpen className="h-4 w-4" />
              Open Class Report
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {cohortSubjectMeta && <Badge variant="blue">{cohortSubjectMeta.cohort_name}</Badge>}
            {curriculumType && <Badge variant="purple">{curriculumType}</Badge>}
            <Badge variant={getReportingSourceVariant(reportingSource)}>
              {getReportingSourceLabel(reportingSource)}
            </Badge>
            {status && (
              <Badge variant="default">{getReportingStatusLabel(status) ?? status}</Badge>
            )}
          </div>
          <div className="w-full xl:w-72">
            <Select
              label="Term"
              value={effectiveTermId?.toString() ?? ''}
              onChange={(event) => updateSearchParams({
                term: event.target.value ? Number(event.target.value) : null,
              })}
              disabled={termsLoading || (terms.length === 0 && !currentTerm)}
              options={
                terms.length > 0
                  ? terms.map((term) => ({
                      value: String(term.id),
                      label: `${term.academic_year_name} — ${term.name}`,
                    }))
                  : [
                      {
                        value: '',
                        label: termsLoading || currentTermLoading ? 'Loading terms...' : 'No terms available',
                      },
                    ]
              }
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => updateSearchParams({ tab: tab.id })}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeQuery.loading && <LoadingSpinner message="Refreshing class subject report..." />}

      {!activeQuery.loading && activeQuery.error && (
        <ErrorState
          fullScreen={false}
          message={
            activeQuery.errorStatus === 403
              ? 'You do not have access to this class subject.'
              : activeQuery.errorStatus === 404
                ? 'This class subject could not be found.'
                : 'We could not load this class view. Try reloading.'
          }
          onRetry={activeQuery.refetch}
        />
      )}

      {!activeQuery.loading && !activeQuery.error && activeTab === 'learners' && learnersQuery.report && (
        learners.length === 0 ? (
          <Card>
            <div className="py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No learners are currently enrolled for this subject.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Learners</h2>
              <Badge variant="blue">{learnersQuery.report.total_learners} learners</Badge>
            </div>
            <CompactReportGrid>
              {learners.map((item) => (
                <CurriculumSubjectReportCard
                  key={item.student.id}
                  heading={item.student.name}
                  subheading={item.student.admission_number}
                  reportingSource={item.reporting_source}
                  performanceSource={item.performance_source}
                  curriculumType={curriculumType}
                  status={item.status}
                  note={item.note}
                  attendance={item.attendance_summary}
                  assessmentCompletion={item.assessment_completion}
                  genericStudent={resolveInstructorGenericStudent(item)}
                  cbcStudent={resolveInstructorCbcStudent(item)}
                />
              ))}
            </CompactReportGrid>
          </div>
        )
      )}

      {!activeQuery.loading && !activeQuery.error && activeTab === 'performance' && performanceQuery.report && (
        <div className="space-y-4">
          <CompactStatsGrid>
            {reportingSource === 'generic' && (
              <>
                <StatsCard title="Learners" value={performanceQuery.report.total_learners} icon={Users} color="blue" />
                <StatsCard title="Average Attendance" value={formatPercent(performanceQuery.report.average_attendance)} icon={Users} color="indigo" />
                <StatsCard title="Average Mark" value={formatPercent(genericPerformance?.average_score ?? performanceQuery.report.average_score)} icon={BookOpen} color="green" />
                <StatsCard title="Computed Results" value={genericPerformance?.computed_count ?? 0} icon={CheckCircle2} color="purple" />
              </>
            )}

            {reportingSource === 'cbc' && (
              <>
                <StatsCard title="Learners" value={performanceQuery.report.total_learners} icon={Users} color="blue" />
                <StatsCard title="Average Attendance" value={formatPercent(performanceQuery.report.average_attendance)} icon={Users} color="indigo" />
                <StatsCard title="CBC Weighted Score" value={formatPercent(cbcPerformance?.average_weighted_score)} icon={BookOpen} color="green" />
                <StatsCard
                  title="Final Results"
                  value={cbcPerformance?.result_counts?.FINAL ?? 0}
                  subtitle={`Missing results: ${cbcPerformance?.missing_result_count ?? 0}`}
                  icon={CheckCircle2}
                  color="purple"
                />
              </>
            )}

            {(reportingSource === 'cambridge_pending' || reportingSource === 'unsupported') && (
              <>
                <StatsCard title="Learners" value={performanceQuery.report.total_learners} icon={Users} color="blue" />
                <StatsCard title="Average Attendance" value={formatPercent(performanceQuery.report.average_attendance)} icon={Users} color="indigo" />
                <StatsCard
                  title="Assessment Completion"
                  value={formatPercent(getAssessmentCompletionRatio(performanceQuery.report.assessment_completion))}
                  icon={CheckCircle2}
                  color="green"
                />
                <StatsCard
                  title="Report Status"
                  value={reportingSource === 'cambridge_pending' ? 'Pending' : 'Unavailable'}
                  subtitle={getReportingSourceLabel(reportingSource)}
                  icon={FileBarChart}
                  color={reportingSource === 'cambridge_pending' ? 'yellow' : 'orange'}
                />
              </>
            )}
          </CompactStatsGrid>

          {performanceQuery.report.assessment_completion && (
            <AssessmentCompletionSummary completion={performanceQuery.report.assessment_completion} />
          )}

          {reportingSource === 'generic' && (
            <Card>
              {genericPerformance ? (
                <GenericPerformanceSummary
                  performance={genericPerformance}
                  averageGrade={performanceQuery.report.average_score}
                  averageGradeNote={note}
                />
              ) : (
                <ReportingSourceState
                  reportingSource={reportingSource}
                  status={status}
                  note={note}
                />
              )}
            </Card>
          )}

          {reportingSource === 'cbc' && (
            <Card>
              {cbcPerformance ? (
                <CbcPerformanceSummary performance={cbcPerformance} />
              ) : (
                <ReportingSourceState
                  reportingSource={reportingSource}
                  status={status}
                  note={note}
                />
              )}
            </Card>
          )}

          {(reportingSource === 'cambridge_pending' || reportingSource === 'unsupported') && (
            <ReportingSourceState
              reportingSource={reportingSource}
              status={status}
              note={note}
            />
          )}
        </div>
      )}

      {!activeQuery.loading && !activeQuery.error && activeTab === 'teaching-activity' && teachingActivityQuery.report && (
        <div className="space-y-4">
          <CompactStatsGrid>
            <StatsCard title="Lessons Planned" value={teachingActivityQuery.report.sessions_created} icon={BookOpen} color="blue" />
            <StatsCard title="Lessons Completed" value={teachingActivityQuery.report.sessions_completed} icon={CheckCircle2} color="green" />
            <StatsCard title="Attendance Marked" value={teachingActivityQuery.report.attendance_marked} icon={Users} color="purple" />
            <StatsCard title="Attendance Completeness" value={formatPercent(teachingActivityQuery.report.attendance_completeness)} icon={Activity} color="indigo" />
          </CompactStatsGrid>

          <Card className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Attendance Expected</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {teachingActivityQuery.report.attendance_expected}
                </p>
              </div>
            </div>
          </Card>

          {teachingActivityQuery.report.sessions_created === 0 && (
            <Card>
              <div className="py-12 text-center">
                <Activity className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  No lessons or attendance records have been captured for this subject yet.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {exportPayload && (
        <ExportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          payload={exportPayload}
          defaultFormat="excel"
          title="Export Class View"
        />
      )}
    </ReportPageShell>
  );
}
