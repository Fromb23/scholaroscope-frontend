'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  FileBarChart,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { learnerReportingAPI } from '@/app/core/api/reporting';
import { downloadBlob } from '@/app/core/api/downloads';
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
import {
  useClassSubjectReport,
  useInstructorCohortSubjects,
} from '@/app/core/hooks/useReporting';
import type {
  ClassSubjectLearnerRow,
  ReportExportFormat,
} from '@/app/core/types/reporting';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';

function parsePositiveNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function LearnerRowsTable({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: ClassSubjectLearnerRow[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold theme-text">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm theme-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
                <th className="px-3 py-2">Learner</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Attendance</th>
                <th className="px-3 py-2 text-right">Assignments</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tone = subjectStatusTone(row.summary_status);
                return (
                  <tr key={row.learner.id} className="border-b theme-border">
                    <td className="px-3 py-3">
                      <div className="font-medium theme-text">{row.learner.name}</div>
                      <div className="text-xs theme-subtle">{row.learner.admission_number}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={toneToBadgeVariant(tone)}>
                        {friendlySubjectStatusLabel(row.summary_status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right theme-muted">
                      {formatReportPercent(row.attendance_rate)}
                    </td>
                    <td className="px-3 py-3 text-right theme-muted">
                      {formatReportPercent(row.assignment_completion_rate)}
                    </td>
                    <td className="px-3 py-3 theme-muted">
                      {row.summary_note || row.note || 'No summary note yet.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function ClassSubjectReportPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const cohortSubjectId = Number(params.id);
  const returnTo = searchParams.get('returnTo') || `/reports/instructor/cohort-subjects/${cohortSubjectId}`;
  const selectedCohortId = parsePositiveNumber(searchParams.get('cohort_id'));

  const {
    cohortSubjects,
    loading: cohortSubjectsLoading,
    error: cohortSubjectsError,
  } = useInstructorCohortSubjects();

  const cohortSubjectMeta = useMemo(
    () => cohortSubjects.find((item) => item.id === cohortSubjectId) ?? null,
    [cohortSubjectId, cohortSubjects],
  );
  const cohortId = selectedCohortId ?? cohortSubjectMeta?.cohort_id ?? null;

  const {
    report,
    loading,
    error,
  } = useClassSubjectReport(cohortId, cohortSubjectId, {
    enabled: Boolean(cohortId && cohortSubjectId),
  });

  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async (format: ReportExportFormat) => {
    if (!cohortId) {
      return;
    }

    try {
      setExportError(null);
      setExporting(format);
      const file = await learnerReportingAPI.exportClassSubjectReport(cohortId, {
        format,
        cohortSubjectId,
      });
      downloadBlob(file.blob, file.fileName);
    } catch (requestError) {
      setExportError(
        extractErrorMessage(requestError as ApiError, 'Failed to export class subject report'),
      );
    } finally {
      setExporting(null);
    }
  }, [cohortId, cohortSubjectId]);

  const visibleError = exportError ?? error ?? cohortSubjectsError ?? null;

  if (cohortSubjectsLoading && !cohortSubjectMeta) {
    return <LoadingSpinner message="Loading class subject report context..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={returnTo}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back to Subject Workspace
            </Button>
          </Link>
          <div className="mt-3">
            <h1 className="text-2xl font-semibold theme-text">Class Subject Report</h1>
            <p className="mt-1 text-sm theme-muted">
              A printable class view that highlights response, support needs, and next teaching actions.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!report || exporting !== null}
            onClick={() => void handleExport('pdf')}
          >
            <Download className="h-4 w-4" />
            {exporting === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!report || exporting !== null}
            onClick={() => void handleExport('xlsx')}
          >
            <Download className="h-4 w-4" />
            {exporting === 'xlsx' ? 'Exporting Excel...' : 'Export Excel'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!report || exporting !== null}
            onClick={() => void handleExport('csv')}
          >
            <Download className="h-4 w-4" />
            {exporting === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {visibleError ? (
        <ErrorBanner message={visibleError} onDismiss={() => setExportError(null)} />
      ) : null}

      {loading ? <LoadingSpinner message="Loading class subject report..." /> : null}

      {report && !loading ? (
        <>
          <Card>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="theme-info-surface flex h-14 w-14 items-center justify-center rounded-xl">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold theme-text">{report.subject.name}</h2>
                    <Badge variant="info">{report.subject.code}</Badge>
                    <Badge variant="default">{report.cohort.name}</Badge>
                  </div>
                  <p className="mt-2 text-sm theme-muted">
                    {report.instructor?.name || 'Instructor not assigned yet'}
                    {report.instructor?.email ? ` · ${report.instructor.email}` : ''}
                  </p>
                  <p className="mt-1 text-sm theme-subtle">
                    {report.period?.label || 'All recorded data'}
                  </p>
                </div>
              </div>

              <div className="text-sm theme-muted">
                <p>Generated {formatReportDate(report.generated_at)}</p>
                <p className="mt-1">{report.learner_count} learner(s) included</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ReportMetricCard
              label="Learners"
              value={report.learner_count}
              note="Learners in this subject report."
              tone={report.learner_count > 0 ? 'success' : 'neutral'}
            />
            <ReportMetricCard
              label="Attendance"
              value={formatReportPercent(report.attendance_trend.attendance_rate)}
              note="Class attendance response."
              tone={report.attendance_trend.attendance_rate != null && report.attendance_trend.attendance_rate >= 75 ? 'success' : 'warning'}
            />
            <ReportMetricCard
              label="Assignments"
              value={formatReportPercent(report.assignment_summary.assignment_completion_rate)}
              note="Assignment follow-through in this class."
              tone={report.assignment_summary.assignment_completion_rate != null && report.assignment_summary.assignment_completion_rate >= 70 ? 'success' : 'warning'}
            />
            <ReportMetricCard
              label="Mastery"
              value={formatReportPercent(report.progress.mastery_percentage)}
              note="Visible mastery or score signal."
              tone={report.progress.mastery_percentage != null && report.progress.mastery_percentage >= 70 ? 'success' : 'warning'}
            />
            <ReportMetricCard
              label="Evidence"
              value={report.progress.evidence_count}
              note="Evidence available in this subject."
              tone={report.progress.evidence_count > 0 ? 'success' : 'warning'}
            />
          </div>

          <Card>
            <div className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5 theme-subtle" />
              <h2 className="text-lg font-semibold theme-text">Class Response</h2>
            </div>
            <p className="mt-4 text-sm theme-muted">
              {report.class_response_summary || 'No class response summary is available yet.'}
            </p>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <LearnerRowsTable
              title="Learners Needing Support"
              rows={report.learners_needing_support}
              emptyMessage="No learners are currently flagged for support in this subject."
            />
            <LearnerRowsTable
              title="Learners On Track"
              rows={report.learners_on_track}
              emptyMessage="No learners are currently on track in this subject yet."
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card>
              <h2 className="text-lg font-semibold theme-text">Full Learner Summary</h2>
              {report.learner_rows.length === 0 ? (
                <p className="mt-4 text-sm theme-muted">
                  No learner rows are available for this subject yet.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
                        <th className="px-3 py-2">Learner</th>
                        <th className="px-3 py-2">Risk</th>
                        <th className="px-3 py-2 text-right">Attendance</th>
                        <th className="px-3 py-2 text-right">Assignments</th>
                        <th className="px-3 py-2 text-right">Evidence</th>
                        <th className="px-3 py-2">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.learner_rows.map((row) => (
                        <tr key={row.learner.id} className="border-b theme-border">
                          <td className="px-3 py-3">
                            <div className="font-medium theme-text">{row.learner.name}</div>
                            <div className="text-xs theme-subtle">{row.learner.admission_number}</div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant={toneToBadgeVariant(riskTone(row.risk_level))}>
                              {friendlyRiskLabel(row.risk_level)}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-right theme-muted">
                            {formatReportPercent(row.attendance_rate)}
                          </td>
                          <td className="px-3 py-3 text-right theme-muted">
                            {formatReportPercent(row.assignment_completion_rate)}
                          </td>
                          <td className="px-3 py-3 text-right theme-muted">{row.evidence_count}</td>
                          <td className="px-3 py-3 theme-muted">
                            {row.summary_note || row.note || 'No summary note yet.'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-semibold theme-text">Recommended Teaching Interventions</h2>
              </div>
              {report.recommended_teaching_interventions.length === 0 ? (
                <p className="mt-4 text-sm theme-muted">
                  No teaching interventions are recommended yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {report.recommended_teaching_interventions.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm theme-text"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {report.learners_exceeding_expectation.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold theme-text">Learners Exceeding Expectation</h3>
                  <div className="mt-3 space-y-2">
                    {report.learners_exceeding_expectation.map((row) => (
                      <div
                        key={`exceeding-${row.learner.id}`}
                        className="rounded-lg border theme-border theme-surface-muted px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium theme-text">{row.learner.name}</p>
                            <p className="text-xs theme-subtle">
                              {row.summary_note || 'Strong response in this subject.'}
                            </p>
                          </div>
                          <Badge variant="success">
                            {friendlySubjectStatusLabel(row.summary_status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
