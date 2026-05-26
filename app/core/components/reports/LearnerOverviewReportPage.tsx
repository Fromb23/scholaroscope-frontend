'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  FileBarChart,
  ShieldAlert,
  User,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { learnerReportingAPI } from '@/app/core/api/reporting';
import { downloadBlob } from '@/app/core/api/downloads';
import { useLearnerOverviewReport } from '@/app/core/hooks/useReporting';
import { useStudent } from '@/app/core/hooks/useStudents';
import type {
  LearnerOverviewSubjectSummary,
  ReportExportFormat,
  ReportRiskLevel,
} from '@/app/core/types/reporting';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';

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

function OverviewMetricCard({
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

function SubjectSummaryList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: LearnerOverviewSubjectSummary[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={`${title}-${item.cohort_subject_id}`} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-gray-900">{item.subject_name}</p>
                <Badge variant="info">{item.subject_code}</Badge>
                <Badge variant={riskVariant(item.risk_level)}>{item.risk_level}</Badge>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Attendance {formatPercent(item.attendance_rate)} ·
                Assignments {formatPercent(item.assignment_completion_rate)} ·
                Mastery {formatPercent(item.mastery_percentage)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function LearnerOverviewReportPage() {
  const params = useParams<{ learnerId: string }>();
  const learnerId = Number(params.learnerId);
  const { student, loading: learnerLoading, error: learnerError } = useStudent(learnerId);
  const {
    report,
    loading: reportLoading,
    error: reportError,
  } = useLearnerOverviewReport(Number.isFinite(learnerId) && learnerId > 0 ? learnerId : null);

  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async (format: ReportExportFormat) => {
    if (!Number.isFinite(learnerId)) {
      return;
    }

    try {
      setExportError(null);
      setExporting(format);
      const file = await learnerReportingAPI.exportLearnerOverviewReport(learnerId, format);
      downloadBlob(file.blob, file.fileName);
    } catch (error) {
      setExportError(
        extractErrorMessage(error as ApiError, 'Failed to export learner overview report'),
      );
    } finally {
      setExporting(null);
    }
  }, [learnerId]);

  const visibleError = exportError ?? reportError ?? learnerError ?? null;

  const subjectSummaries = useMemo(
    () => report?.subject_summaries ?? [],
    [report?.subject_summaries],
  );

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
            <h1 className="text-2xl font-semibold text-gray-900">Learner Overview Report</h1>
            <p className="mt-1 text-sm text-gray-500">
              Organization-wide learner performance view across attendance, assignments, and subject progress.
            </p>
          </div>
        </div>

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
      </div>

      {visibleError && (
        <ErrorBanner
          message={visibleError}
          onDismiss={() => setExportError(null)}
        />
      )}

      {reportLoading && <LoadingSpinner message="Loading learner overview report..." />}

      {report && !reportLoading && (
        <>
          <Card>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">{report.learner.name}</h2>
                    <Badge variant={riskVariant(report.learning_risk_level)}>
                      Learning {report.learning_risk_level}
                    </Badge>
                    <Badge variant={riskVariant(report.participation_risk_level)}>
                      Participation {report.participation_risk_level}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {report.learner.admission_number}
                    {report.learner.primary_cohort_name ? ` · ${report.learner.primary_cohort_name}` : ''}
                    {report.organization.name ? ` · ${report.organization.name}` : ''}
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                <p>Generated {formatDate(report.generated_at)}</p>
                <p className="mt-1">Subjects in scope {report.subject_count}</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OverviewMetricCard label="Overall Attendance" value={formatPercent(report.overall_attendance_rate)} />
            <OverviewMetricCard
              label="Assignment Completion"
              value={formatPercent(report.overall_assignment_completion_rate)}
            />
            <OverviewMetricCard label="Subjects in Scope" value={report.subject_count} />
            <OverviewMetricCard label="Evidence Count" value={report.evidence_count} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SubjectSummaryList
              title="Strongest Subjects"
              items={report.strongest_subjects}
              emptyMessage="No strongest-subject signals are available yet."
            />
            <SubjectSummaryList
              title="Subjects Needing Support"
              items={report.subjects_needing_support}
              emptyMessage="No support subjects are currently flagged."
            />
            <SubjectSummaryList
              title="Subjects On Track"
              items={report.subjects_on_track}
              emptyMessage="No on-track subjects are currently available."
            />
          </div>

          <Card>
            <div className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Subject Performance Summary</h2>
            </div>
            {subjectSummaries.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No subject-level learner performance data is available in this organization yet.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Risk</th>
                      <th className="px-3 py-2 text-right">Attendance</th>
                      <th className="px-3 py-2 text-right">Assignments</th>
                      <th className="px-3 py-2 text-right">Mastery</th>
                      <th className="px-3 py-2 text-right">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectSummaries.map((subject) => (
                      <tr key={subject.cohort_subject_id} className="border-b border-gray-100">
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-900">{subject.subject_name}</div>
                          <div className="text-xs text-gray-500">{subject.subject_code} · {subject.cohort_name}</div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={riskVariant(subject.risk_level)}>{subject.risk_level}</Badge>
                        </td>
                        <td className="px-3 py-3 text-right text-gray-700">{formatPercent(subject.attendance_rate)}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{formatPercent(subject.assignment_completion_rate)}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{formatPercent(subject.mastery_percentage)}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{subject.evidence_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-gray-900">Subjects Requiring Intervention</h2>
              </div>
              {report.subjects_needing_support.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No intervention targets are currently flagged.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {report.subjects_needing_support.map((item) => (
                    <div key={`support-${item.cohort_subject_id}`} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900">{item.subject_name}</p>
                        <Badge variant={riskVariant(item.risk_level)}>{item.risk_level}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        Attendance {formatPercent(item.attendance_rate)} · Assignments {formatPercent(item.assignment_completion_rate)} · Mastery {formatPercent(item.mastery_percentage)}
                      </p>
                      {item.weak_areas.length > 0 ? (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-500">
                          {item.weak_areas.map((weakArea) => (
                            <li key={`${item.cohort_subject_id}-${weakArea.label}`}>{weakArea.label}: {weakArea.metric}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900">Recommendations</h2>
              {report.overall_recommendations.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No organization-level recommendations are available yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {report.overall_recommendations.map((recommendation) => (
                    <li key={recommendation} className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
                      {recommendation}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
