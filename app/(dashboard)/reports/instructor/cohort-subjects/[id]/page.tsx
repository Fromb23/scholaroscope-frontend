'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState, type ElementType } from 'react';
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
  useInstructorCohortSubjectLearners,
  useInstructorCohortSubjectPerformance,
  useInstructorCohortSubjectTeachingActivity,
  useInstructorCohortSubjects,
} from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import {
  countMapFromItems,
  formatPercent,
  resolveCbcStudentResult,
  toCbcPerformance,
  toGenericPerformance,
} from '@/app/core/lib/reportingPresentation';
import type {
  CbcPerformance,
  GenericPerformance,
  GenericStudentSection,
  InstructorLearnerReportRow,
  ReportingSource,
} from '@/app/core/types/reporting';
import type { ExportPayload } from '@/app/types/export';

type DetailTab = 'learners' | 'performance' | 'teaching-activity';

const TABS: Array<{ id: DetailTab; label: string; icon: ElementType }> = [
  { id: 'learners', label: 'Learners', icon: Users },
  { id: 'performance', label: 'Performance', icon: FileBarChart },
  { id: 'teaching-activity', label: 'Teaching Activity', icon: Activity },
];

function toGenericCompatibilityResult(item: InstructorLearnerReportRow): GenericStudentSection | null {
  if (item.generic_result) return item.generic_result;
  if (!item.computed_grade && !item.grade_summary) return null;

  return {
    final_score: item.computed_grade?.final_score ?? null,
    average_score: item.grade_summary?.average_score ?? null,
    weighted_average: item.grade_summary?.weighted_average ?? null,
    letter_grade: item.computed_grade?.letter_grade ?? item.grade_summary?.final_grade ?? null,
    letter_label: item.computed_grade?.letter_label ?? null,
    grade_status: item.computed_grade?.grade_status ?? null,
  };
}

function buildGenericPerformanceFallback(
  report: ReturnType<typeof useInstructorCohortSubjectPerformance>['report'],
): GenericPerformance | null {
  if (!report) return null;
  if (report.generic_performance || report.generic_summary) {
    return toGenericPerformance(report.generic_performance ?? report.generic_summary);
  }

  if (
    report.average_score == null
    && report.highest_score == null
    && report.lowest_score == null
    && report.grade_distribution.length === 0
    && report.grade_status_counts.length === 0
    && report.assessment_type_breakdown.length === 0
  ) {
    return null;
  }

  return {
    average_score: report.average_score,
    highest_score: report.highest_score,
    lowest_score: report.lowest_score,
    computed_count: report.total_learners,
    distribution_by_letter: countMapFromItems(report.grade_distribution, 'letter_grade'),
    grade_status_counts: countMapFromItems(report.grade_status_counts, 'grade_status'),
    assessment_type_breakdown: report.assessment_type_breakdown,
  };
}

export default function InstructorCohortSubjectDetailReportPage() {
  const params = useParams<{ id: string }>();
  const cohortSubjectId = Number(params.id);
  const isValidCohortSubjectId = Number.isFinite(cohortSubjectId) && cohortSubjectId > 0;

  const [activeTab, setActiveTab] = useState<DetailTab>('learners');
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const { terms, loading: termsLoading } = useTerms();
  const {
    cohortSubjects,
    loading: cohortSubjectsLoading,
    error: cohortSubjectsError,
  } = useInstructorCohortSubjects();

  const learnersQuery = useInstructorCohortSubjectLearners(
    isValidCohortSubjectId ? cohortSubjectId : null,
    selectedTerm,
    { enabled: activeTab === 'learners' && isValidCohortSubjectId },
  );
  const performanceQuery = useInstructorCohortSubjectPerformance(
    isValidCohortSubjectId ? cohortSubjectId : null,
    selectedTerm,
    { enabled: activeTab === 'performance' && isValidCohortSubjectId },
  );
  const teachingActivityQuery = useInstructorCohortSubjectTeachingActivity(
    isValidCohortSubjectId ? cohortSubjectId : null,
    selectedTerm,
    { enabled: activeTab === 'teaching-activity' && isValidCohortSubjectId },
  );

  const cohortSubjectMeta = cohortSubjects.find((item) => item.id === cohortSubjectId) ?? null;
  const reportMeta = learnersQuery.report ?? performanceQuery.report ?? teachingActivityQuery.report ?? null;

  const pageTitle = cohortSubjectMeta
    ? `${cohortSubjectMeta.cohort_name} — ${cohortSubjectMeta.subject_name}`
    : reportMeta?.cohort_subject
      ? `${reportMeta.cohort_subject.cohort_name} — ${reportMeta.cohort_subject.subject_name}`
      : `Cohort Subject #${cohortSubjectId}`;

  const reportingSource = (reportMeta?.reporting_source ?? cohortSubjectMeta?.reporting_source ?? 'unsupported') as ReportingSource;
  const curriculumType = reportMeta?.curriculum_type ?? cohortSubjectMeta?.curriculum_type ?? null;
  const status = reportMeta?.status ?? cohortSubjectMeta?.status ?? null;
  const note = reportMeta?.note ?? cohortSubjectMeta?.note ?? null;

  const genericPerformance = buildGenericPerformanceFallback(performanceQuery.report);
  const cbcPerformance = toCbcPerformance(
    performanceQuery.report?.cbc_performance ?? performanceQuery.report?.cbc_summary,
  ) as CbcPerformance | null;

  const activeQuery = activeTab === 'learners'
    ? learnersQuery
    : activeTab === 'performance'
      ? performanceQuery
      : teachingActivityQuery;

  const exportPayload = useMemo<ExportPayload | null>(() => {
    if (!isValidCohortSubjectId) return null;

    if (activeTab === 'learners' && learnersQuery.report) {
      return {
        title: `${pageTitle} Learners`,
        subtitle: selectedTerm
          ? terms.find((term) => term.id === selectedTerm)?.name ?? 'Selected term'
          : 'All terms',
        metadata: {
          generatedAt: new Date().toLocaleString(),
        },
        columns: [
          { key: 'student_name', label: 'Learner', width: 24 },
          { key: 'admission_number', label: 'Admission No.', width: 14 },
          { key: 'reporting_source', label: 'Reporting Source', width: 18 },
          { key: 'status', label: 'Result Status', width: 16 },
          { key: 'attendance', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
          { key: 'generic_score', label: 'Generic Score', format: 'percentage', width: 14, align: 'right' as const },
          { key: 'cbc_weighted_score', label: 'CBC Weighted Score', format: 'percentage', width: 18, align: 'right' as const },
          { key: 'cbc_code', label: 'CBC Code', width: 12 },
          { key: 'assessments', label: 'Assessment Completion', width: 20 },
        ],
        rows: learnersQuery.report.learners.map((item) => {
          const genericResult = toGenericCompatibilityResult(item);
          const cbcResult = resolveCbcStudentResult(item.cbc_result ?? null);
          return {
            student_name: item.student.name,
            admission_number: item.student.admission_number,
            reporting_source: item.reporting_source,
            status: item.status ?? item.computed_grade?.grade_status ?? '—',
            attendance: item.attendance_summary?.average ?? null,
            generic_score: genericResult?.final_score ?? genericResult?.average_score ?? genericResult?.weighted_average ?? null,
            cbc_weighted_score: cbcResult?.weighted_score ?? null,
            cbc_code: cbcResult?.cbc_code ?? '—',
            assessments: `${item.assessment_completion.completed_scores ?? item.assessment_completion.finalized_assessments}/${item.assessment_completion.total_assessments}`,
          };
        }),
        fileName: `learner-report-${cohortSubjectId}`,
        includeMetadata: true,
        includeTimestamp: true,
        sheetName: 'Learners',
        freezeHeader: true,
        autoFilter: true,
        orientation: 'landscape' as const,
      };
    }

    if (activeTab === 'performance' && performanceQuery.report) {
      const rows = genericPerformance
        ? [
            ...Object.entries(genericPerformance.distribution_by_letter).map(([label, count]) => ({
              section: 'Generic Numeric Distribution',
              label,
              count,
              score: null,
            })),
            ...Object.entries(genericPerformance.grade_status_counts).map(([label, count]) => ({
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
              ...Object.entries(cbcPerformance.result_counts).map(([label, count]) => ({
                section: 'CBC Result Status',
                label,
                count,
                score: null,
              })),
              ...Object.entries(cbcPerformance.distribution_by_code).map(([label, count]) => ({
                section: 'CBC Code',
                label,
                count,
                score: null,
              })),
            ]
          : [];

      return {
        title: `${pageTitle} Performance`,
        subtitle: selectedTerm
          ? terms.find((term) => term.id === selectedTerm)?.name ?? 'Selected term'
          : 'All terms',
        metadata: {
          reportingSource,
          generatedAt: new Date().toLocaleString(),
        },
        columns: [
          { key: 'section', label: 'Section', width: 20 },
          { key: 'label', label: 'Label', width: 24 },
          { key: 'count', label: 'Count', format: 'number', width: 12, align: 'right' as const },
          { key: 'score', label: 'Average Score', format: 'percentage', width: 16, align: 'right' as const },
        ],
        rows,
        fileName: `performance-report-${cohortSubjectId}`,
        includeMetadata: true,
        includeTimestamp: true,
        sheetName: 'Performance',
        freezeHeader: true,
        autoFilter: true,
        orientation: 'landscape' as const,
      };
    }

    if (activeTab === 'teaching-activity' && teachingActivityQuery.report) {
      return {
        title: `${pageTitle} Teaching Activity`,
        subtitle: selectedTerm
          ? terms.find((term) => term.id === selectedTerm)?.name ?? 'Selected term'
          : 'All terms',
        metadata: {
          generatedAt: new Date().toLocaleString(),
        },
        columns: [
          { key: 'sessions_created', label: 'Sessions Created', format: 'number', width: 16, align: 'right' as const },
          { key: 'sessions_completed', label: 'Sessions Completed', format: 'number', width: 18, align: 'right' as const },
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
        fileName: `teaching-activity-report-${cohortSubjectId}`,
        includeMetadata: true,
        includeTimestamp: true,
        sheetName: 'Teaching Activity',
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
    learnersQuery.report,
    pageTitle,
    performanceQuery.report,
    reportingSource,
    selectedTerm,
    teachingActivityQuery.report,
    terms,
  ]);

  if (!isValidCohortSubjectId) {
    return <ErrorState message="Invalid cohort subject." fullScreen={false} />;
  }

  if (cohortSubjectsLoading && !cohortSubjectMeta && activeQuery.loading) {
    return <LoadingSpinner />;
  }

  if (cohortSubjectsError && !cohortSubjectMeta) {
    return <ErrorState message={cohortSubjectsError} fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/reports/instructor/cohort-subjects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{pageTitle}</h1>
            <p className="mt-1 text-gray-500">
              Assigned-scope reporting for learners, performance, and teaching activity.
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

      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {cohortSubjectMeta && <Badge variant="blue">{cohortSubjectMeta.cohort_name}</Badge>}
            {curriculumType && <Badge variant="purple">{curriculumType}</Badge>}
            <Badge variant="default">{reportingSource}</Badge>
            {status && <Badge variant="default">{status}</Badge>}
          </div>
          <div className="w-full xl:w-72">
            <Select
              label="Term (optional)"
              value={selectedTerm?.toString() ?? ''}
              onChange={(event) => setSelectedTerm(event.target.value ? Number(event.target.value) : null)}
              disabled={termsLoading}
              options={[
                { value: '', label: 'All terms' },
                ...terms.map((term) => ({
                  value: String(term.id),
                  label: `${term.academic_year_name} — ${term.name}`,
                })),
              ]}
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
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
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

      {activeQuery.loading && <LoadingSpinner />}

      {!activeQuery.loading && activeQuery.error && (
        <ErrorState
          fullScreen={false}
          message={
            activeQuery.errorStatus === 403
              ? activeQuery.error || 'You do not have access to this report.'
              : activeQuery.errorStatus === 404
                ? activeQuery.error || 'This report could not be found.'
                : activeQuery.error
          }
          onRetry={activeQuery.refetch}
        />
      )}

      {!activeQuery.loading && !activeQuery.error && activeTab === 'learners' && learnersQuery.report && (
        learnersQuery.report.learners.length === 0 ? (
          <Card>
            <div className="py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No active learners are visible for this cohort subject.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Learners</h2>
              <Badge variant="blue">{learnersQuery.report.total_learners} learners</Badge>
            </div>
            <div className="grid gap-4">
              {learnersQuery.report.learners.map((item) => (
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
                  genericStudent={toGenericCompatibilityResult(item)}
                  cbcStudent={item.cbc_result ?? null}
                />
              ))}
            </div>
          </div>
        )
      )}

      {!activeQuery.loading && !activeQuery.error && activeTab === 'performance' && performanceQuery.report && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard title="Learners" value={performanceQuery.report.total_learners} icon={Users} color="blue" />
            <StatsCard title="Average Attendance" value={formatPercent(performanceQuery.report.average_attendance)} icon={Users} color="indigo" />
            <StatsCard title="Generic Average" value={formatPercent(genericPerformance?.average_score)} icon={BookOpen} color="green" />
            <StatsCard title="CBC Weighted Score" value={formatPercent(cbcPerformance?.average_weighted_score)} icon={BookOpen} color="purple" />
          </div>

          {performanceQuery.report.assessment_completion && (
            <AssessmentCompletionSummary completion={performanceQuery.report.assessment_completion} />
          )}

          {reportingSource === 'generic' && genericPerformance && (
            <Card>
              <GenericPerformanceSummary
                performance={genericPerformance}
                averageGrade={performanceQuery.report.average_score}
                averageGradeNote={note}
              />
            </Card>
          )}

          {reportingSource === 'cbc' && cbcPerformance && (
            <Card>
              <CbcPerformanceSummary performance={cbcPerformance} />
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
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard title="Sessions Created" value={teachingActivityQuery.report.sessions_created} icon={BookOpen} color="blue" />
            <StatsCard title="Sessions Completed" value={teachingActivityQuery.report.sessions_completed} icon={CheckCircle2} color="green" />
            <StatsCard title="Attendance Marked" value={teachingActivityQuery.report.attendance_marked} icon={Users} color="purple" />
            <StatsCard title="Attendance Completeness" value={formatPercent(teachingActivityQuery.report.attendance_completeness)} icon={Activity} color="indigo" />
          </div>

          <Card>
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
                  No teaching activity has been recorded for this cohort subject yet.
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
          title="Export Report"
        />
      )}
    </div>
  );
}
