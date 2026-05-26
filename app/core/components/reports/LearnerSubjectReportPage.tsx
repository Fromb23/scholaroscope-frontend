'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  FileBarChart,
  GraduationCap,
  Target,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { learnerReportingAPI } from '@/app/core/api/reporting';
import { useLearnerSubjectReport } from '@/app/core/hooks/useReporting';
import { useStudent } from '@/app/core/hooks/useStudents';
import type {
  LearnerReportMetricItem,
  LearnerReportStrandSummary,
  ReportExportFormat,
  ReportRiskLevel,
} from '@/app/core/types/reporting';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import { downloadBlob } from '@/app/core/api/downloads';

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

function SubjectMetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </Card>
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
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <div key={`${title}-${item.type}-${item.label}`} className="rounded-lg border border-gray-200 p-4">
              <p className="font-medium text-gray-900">{item.label}</p>
              <p className="mt-1 text-sm text-gray-500">{item.metric}</p>
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
        <Target className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Outcome Coverage by Strand</h2>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No subject outcome coverage has been recorded yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
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
                <tr key={`${row.strand_code}-${row.strand_name}`} className="border-b border-gray-100">
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900">{row.strand_name}</div>
                    <div className="text-xs text-gray-500">{row.strand_code}</div>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700">{row.selected_outcomes}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{row.taught_outcomes}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{row.mastered_outcomes}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatPercent(row.coverage_percentage)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatPercent(row.mastery_percentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function LearnerSubjectReportPage() {
  const params = useParams<{ learnerId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const learnerId = Number(params.learnerId);
  const selectedCohortSubjectId = parsePositiveNumber(searchParams.get('cohort_subject'));

  const { student, loading: learnerLoading, error: learnerError } = useStudent(learnerId);
  const {
    report,
    loading: reportLoading,
    error: reportError,
    refetch,
  } = useLearnerSubjectReport(
    Number.isFinite(learnerId) && learnerId > 0 ? learnerId : null,
    selectedCohortSubjectId,
    { enabled: Boolean(selectedCohortSubjectId) },
  );

  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const subjectOptions = useMemo(() => {
    const fromLearner = (student?.current_subjects ?? []).map((subject) => ({
      id: subject.id,
      label: `${subject.code} - ${subject.name}${subject.cohort ? ` (${subject.cohort})` : ''}`,
    }));
    if (fromLearner.length > 0) {
      return fromLearner;
    }
    if (report) {
      return [{
        id: report.cohort_subject.id,
        label: `${report.subject.code} - ${report.subject.name} (${report.cohort.name})`,
      }];
    }
    return [];
  }, [report, student?.current_subjects]);

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
    if (!selectedCohortSubjectId && subjectOptions.length === 1) {
      updateCohortSubject(subjectOptions[0].id);
    }
  }, [selectedCohortSubjectId, subjectOptions, updateCohortSubject]);

  const handleExport = useCallback(async (format: ReportExportFormat) => {
    if (!selectedCohortSubjectId || !Number.isFinite(learnerId)) {
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
  }, [learnerId, selectedCohortSubjectId]);

  const visibleError = exportError ?? reportError ?? learnerError ?? null;

  if (learnerLoading && !student) {
    return <LoadingSpinner message="Loading learner reporting context..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/learners/${learnerId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back to Learner Profile
            </Button>
          </Link>
          <div className="mt-3">
            <h1 className="text-2xl font-semibold text-gray-900">Learner Subject Report</h1>
            <p className="mt-1 text-sm text-gray-500">
              Subject-scoped performance preview from attendance, assignments, assessments, and curriculum evidence.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedCohortSubjectId || exporting !== null}
            onClick={() => void handleExport('pdf')}
          >
            <Download className="h-4 w-4" />
            {exporting === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedCohortSubjectId || exporting !== null}
            onClick={() => void handleExport('xlsx')}
          >
            <Download className="h-4 w-4" />
            {exporting === 'xlsx' ? 'Exporting Excel...' : 'Export Excel'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!selectedCohortSubjectId || exporting !== null}
            onClick={() => void handleExport('csv')}
          >
            <Download className="h-4 w-4" />
            {exporting === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {visibleError && (
        <ErrorBanner
          message={visibleError}
          onDismiss={() => setExportError(null)}
        />
      )}

      <Card>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Learner</p>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {report?.learner.name ?? student?.full_name ?? 'Learner'}
                </p>
                <p className="text-sm text-gray-500">
                  {report?.learner.admission_number ?? student?.admission_number ?? '-'}
                </p>
              </div>
            </div>
          </div>

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
        </div>
      </Card>

      {!selectedCohortSubjectId && (
        <Card>
          <div className="py-12 text-center">
            <FileBarChart className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 font-medium text-gray-900">Select a subject to preview the report.</p>
            <p className="mt-1 text-sm text-gray-500">
              The backend determines whether the active role can access the selected learner and subject scope.
            </p>
          </div>
        </Card>
      )}

      {reportLoading && selectedCohortSubjectId && (
        <LoadingSpinner message="Loading learner subject report..." />
      )}

      {report && !reportLoading && (
        <>
          <Card>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-900">{report.subject.name}</h2>
                  <Badge variant="info">{report.subject.code}</Badge>
                  <Badge variant={riskVariant(report.risk_level)}>{report.risk_level} risk</Badge>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {report.cohort.name}
                  {report.cohort.level ? ` · ${report.cohort.level}` : ''}
                  {report.curriculum_type ? ` · ${report.curriculum_type}` : ''}
                </p>
                {report.note ? (
                  <p className="mt-3 text-sm text-gray-600">{report.note}</p>
                ) : null}
              </div>

              <div className="space-y-2 text-sm text-gray-500">
                <p>Generated {formatDate(report.generated_at)}</p>
                {report.instructor_context?.instructor_name ? (
                  <p>Instructor {report.instructor_context.instructor_name}</p>
                ) : null}
                {report.assessments.computed_grade?.letter_grade ? (
                  <p>
                    Grade {report.assessments.computed_grade.letter_grade}
                    {report.assessments.numeric_average != null
                      ? ` · ${formatPercent(report.assessments.numeric_average)}`
                      : ''}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SubjectMetricCard label="Attendance Rate" value={formatPercent(report.attendance.attendance_rate)} />
            <SubjectMetricCard
              label="Assignment Completion"
              value={formatPercent(report.assignments.assignment_completion_rate)}
            />
            <SubjectMetricCard label="Outcome Mastery" value={formatPercent(report.progress.mastery_percentage)} />
            <SubjectMetricCard label="Evidence Count" value={report.progress.evidence_count} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>Sessions recorded</span><span>{report.attendance.sessions_total}</span></div>
                <div className="flex justify-between"><span>Attended</span><span>{report.attendance.sessions_attended}</span></div>
                <div className="flex justify-between"><span>Missed</span><span>{report.attendance.sessions_missed}</span></div>
                <div className="flex justify-between"><span>Late</span><span>{report.attendance.late_count}</span></div>
                <div className="flex justify-between"><span>Latest session</span><span>{formatDate(report.attendance.latest_session_date)}</span></div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900">Assignments</h2>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>Total assigned</span><span>{report.assignments.assignments_total}</span></div>
                <div className="flex justify-between"><span>Submitted</span><span>{report.assignments.assignments_submitted}</span></div>
                <div className="flex justify-between"><span>Reviewed</span><span>{report.assignments.assignments_reviewed}</span></div>
                <div className="flex justify-between"><span>Missing</span><span>{report.assignments.assignments_missing}</span></div>
                <div className="flex justify-between"><span>Latest due date</span><span>{formatDate(report.assignments.latest_due_at)}</span></div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900">Progress</h2>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>Outcomes selected</span><span>{report.progress.outcomes_selected}</span></div>
                <div className="flex justify-between"><span>Outcomes covered</span><span>{report.progress.outcomes_taught}</span></div>
                <div className="flex justify-between"><span>Outcomes mastered</span><span>{report.progress.outcomes_mastered}</span></div>
                <div className="flex justify-between"><span>Coverage</span><span>{formatPercent(report.progress.outcome_coverage_percentage)}</span></div>
                <div className="flex justify-between"><span>Latest evidence</span><span>{formatDate(report.progress.latest_observation_date)}</span></div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <MetricList
              title="Strengths"
              items={report.strengths}
              emptyMessage="No strengths meet the current report thresholds yet."
            />
            <MetricList
              title="Weak Areas"
              items={report.weak_areas}
              emptyMessage="No weak areas are currently flagged for this subject."
            />
          </div>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900">Recommended Follow-up</h2>
            {report.recommended_actions.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No recommended follow-up actions yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {report.recommended_actions.map((action) => (
                  <li key={action} className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
                    {action}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900">Learning Graph</h2>
            {report.learning_graph.points.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No time-series evidence has been captured yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">Period</th>
                      <th className="px-3 py-2 text-right">Attendance</th>
                      <th className="px-3 py-2 text-right">Assignments</th>
                      <th className="px-3 py-2 text-right">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.learning_graph.points.map((point) => (
                      <tr key={point.period} className="border-b border-gray-100">
                        <td className="px-3 py-3 font-medium text-gray-900">{point.period}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{formatPercent(point.attendance_rate)}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{formatPercent(point.assignment_completion_rate)}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{point.evidence_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <StrandTable rows={report.progress.strand_summaries} />

          <Card>
            <h2 className="text-lg font-semibold text-gray-900">Assessment and Evidence Summary</h2>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>Assessments recorded</span><span>{report.assessments.assessment_count}</span></div>
                <div className="flex justify-between"><span>Finalized assessments</span><span>{report.assessments.finalized_assessment_count}</span></div>
                <div className="flex justify-between"><span>Latest assessment</span><span>{formatDate(report.assessments.latest_assessment_date)}</span></div>
                <div className="flex justify-between"><span>Numeric average</span><span>{formatPercent(report.assessments.numeric_average)}</span></div>
                <div className="flex justify-between"><span>Lessons with evidence</span><span>{report.lesson_participation.lessons_with_evidence}</span></div>
              </div>

              <div className="space-y-4">
                {report.assessments.computed_grade ? (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="font-medium text-gray-900">Computed Grade</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {report.assessments.computed_grade.letter_grade ?? '-'}
                      {report.assessments.computed_grade.final_score != null
                        ? ` · ${report.assessments.computed_grade.final_score.toFixed(1)}%`
                        : ''}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {report.assessments.computed_grade.policy_name ?? 'Policy unavailable'}
                    </p>
                  </div>
                ) : null}

                {report.assessments.cbc_result ? (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="font-medium text-gray-900">CBC Result</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {report.assessments.cbc_result.cbc_code ?? '-'}
                      {report.assessments.cbc_result.weighted_score != null
                        ? ` · ${formatPercent(report.assessments.cbc_result.weighted_score)}`
                        : ''}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Status {report.assessments.cbc_result.result_status ?? 'Unavailable'}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Latest Evidence</h3>
              {report.progress.latest_evidence.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No subject evidence has been recorded yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {report.progress.latest_evidence.map((item) => (
                    <div
                      key={`${item.learning_outcome_code}-${item.observed_at}`}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="indigo">{item.learning_outcome_code}</Badge>
                        <span className="text-sm text-gray-500">{formatDate(item.observed_at)}</span>
                      </div>
                      <p className="mt-2 font-medium text-gray-900">{item.learning_outcome_description}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.evaluation_type} · {item.source_type}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {!reportLoading && selectedCohortSubjectId && !report && !visibleError && (
        <Card>
          <div className="py-12 text-center">
            <p className="font-medium text-gray-900">No report preview is available yet.</p>
            <p className="mt-1 text-sm text-gray-500">
              Select a valid learner subject scope, then refresh once activity or evidence exists.
            </p>
            <div className="mt-4">
              <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                Reload Preview
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
