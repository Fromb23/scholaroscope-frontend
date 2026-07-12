'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
import {
  ButtonPendingContent,
  EntityLoadingState,
  ReportPreparingState,
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
import { useLearnerOverviewReport } from '@/app/core/hooks/useReporting';
import { useReportExport } from '@/app/core/hooks/reports/useReportExport';
import { useStudent } from '@/app/core/hooks/useStudents';
import type { LearnerOverviewSubjectSummary } from '@/app/core/types/reporting';

function labelize(value: string | null | undefined): string {
  return String(value ?? '').replace(/_/g, ' ').trim() || 'Not available';
}

function formatMasteryOrScore(subject: LearnerOverviewSubjectSummary): string {
  if (subject.reporting_source === 'cbc') {
    const performance = subject.competency_result?.performance ?? subject.performance ?? null;
    if (performance?.level) {
      return performance.label ? `${performance.level} · ${performance.label}` : performance.level;
    }
    if (performance?.status) {
      return labelize(performance.status);
    }
    return subject.cbc_result?.result_status
      ? labelize(subject.cbc_result.result_status)
      : 'CBC result pending';
  }
  if (subject.mastery_percentage != null) {
    return formatReportPercent(subject.mastery_percentage);
  }
  if (subject.numeric_average != null) {
    return formatReportPercent(subject.numeric_average);
  }
  return 'No data yet';
}

function SummaryInsightList({
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
      <h2 className="text-lg font-semibold theme-text">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm theme-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const tone = subjectStatusTone(item.summary_status);
            return (
              <div
                key={`${title}-${item.cohort_subject_id}`}
                className="rounded-lg border theme-border theme-surface-muted p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium theme-text">{item.subject_name}</p>
                  <Badge variant="info">{item.subject_code}</Badge>
                  <Badge variant={toneToBadgeVariant(tone)}>
                    {friendlySubjectStatusLabel(item.summary_status)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm theme-muted">
                  {item.summary_note || item.note || 'No summary note is available yet.'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function LearnerOverviewReportPage() {
  const params = useParams<{ learnerId: string }>();
  const searchParams = useSearchParams();
  const learnerId = Number(params.learnerId);
  const returnTo = searchParams.get('returnTo') || `/learners/${learnerId}`;
  const { student, loading: learnerLoading, error: learnerError } = useStudent(learnerId);
  const {
    report,
    loading: reportLoading,
    error: reportError,
  } = useLearnerOverviewReport(Number.isFinite(learnerId) && learnerId > 0 ? learnerId : null);

  const { handleExport, exporting } = useReportExport(async (format) => {
    if (!Number.isFinite(learnerId)) {
      throw new Error('Open a learner overview report before exporting.');
    }

    return learnerReportingAPI.exportLearnerOverviewReport(learnerId, format);
  }, 'learner overview report');

  const visibleError = reportError ?? learnerError ?? null;
  const subjectSummaries = useMemo(
    () => report?.subject_summaries ?? [],
    [report?.subject_summaries],
  );

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
            <h1 className="text-2xl font-semibold theme-text">Learner Overall Report</h1>
            <p className="mt-1 text-sm theme-muted">
              A concise learner summary for parents, learners, and school leadership.
            </p>
          </div>
        </div>

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
      </div>

      {visibleError ? (
        <ErrorBanner
          message={visibleError}
          onDismiss={() => undefined}
        />
      ) : null}

      {reportLoading ? (
        <ReportPreparingState
          title={`Building ${student?.name ?? 'learner'}'s overview report...`}
          steps={[
            'Collecting learner profile',
            'Reading attendance and assignment signals',
            'Calculating learning and participation risk',
            'Preparing recommendations',
          ]}
          activeStep={1}
        />
      ) : null}

      {report && !reportLoading ? (
        <>
          <Card>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="theme-info-surface flex h-14 w-14 items-center justify-center rounded-xl">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold theme-text">{report.learner.name}</h2>
                    <Badge variant={toneToBadgeVariant(riskTone(report.learning_risk_level))}>
                      Learning {friendlyRiskLabel(report.learning_risk_level)}
                    </Badge>
                    <Badge variant={toneToBadgeVariant(riskTone(report.participation_risk_level))}>
                      Participation {friendlyRiskLabel(report.participation_risk_level)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm theme-muted">
                    {report.learner.admission_number}
                    {report.learner.primary_cohort_name ? ` · ${report.learner.primary_cohort_name}` : ''}
                    {report.organization.name ? ` · ${report.organization.name}` : ''}
                  </p>
                  <p className="mt-1 text-sm theme-subtle">
                    {report.period?.label || 'All recorded data'}
                  </p>
                </div>
              </div>

              <div className="text-sm theme-muted">
                <p>Generated {formatReportDate(report.generated_at)}</p>
                <p className="mt-1">{report.subject_count} subject summaries included</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ReportMetricCard
              label="Attendance"
              value={formatReportPercent(report.overall_attendance_rate)}
              note="Overall attendance rate for the reporting period."
              tone={riskTone(report.participation_risk_level)}
            />
            <ReportMetricCard
              label="Assignment Completion"
              value={formatReportPercent(report.overall_assignment_completion_rate)}
              note="How consistently assignment work is being completed."
              tone={riskTone(report.participation_risk_level)}
            />
            <ReportMetricCard
              label="Learning Evidence"
              value={report.evidence_count}
              note="Evidence available across visible subjects."
              tone={report.evidence_count > 0 ? 'success' : 'warning'}
            />
            <ReportMetricCard
              label="Participation Risk"
              value={friendlyRiskLabel(report.participation_risk_level)}
              note="Attendance and submission signal."
              tone={riskTone(report.participation_risk_level)}
            />
            <ReportMetricCard
              label="Learning Risk"
              value={friendlyRiskLabel(report.learning_risk_level)}
              note="Current learning response signal."
              tone={riskTone(report.learning_risk_level)}
            />
          </div>

          <Card>
            <div className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5 theme-subtle" />
              <h2 className="text-lg font-semibold theme-text">Subject Summary</h2>
            </div>
            {subjectSummaries.length === 0 ? (
              <p className="mt-4 text-sm theme-muted">
                No subject summaries are available for this learner yet.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Attendance</th>
                      <th className="px-3 py-2 text-right">Assignments</th>
                      <th className="px-3 py-2 text-right">Mastery / Score</th>
                      <th className="px-3 py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectSummaries.map((subject) => {
                      const tone = subjectStatusTone(subject.summary_status);
                      return (
                        <tr key={subject.cohort_subject_id} className="border-b theme-border">
                          <td className="px-3 py-3">
                            <div className="font-medium theme-text">{subject.subject_name}</div>
                            <div className="text-xs theme-subtle">
                              {subject.subject_code} · {subject.cohort_name}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant={toneToBadgeVariant(tone)}>
                              {friendlySubjectStatusLabel(subject.summary_status)}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-right theme-muted">
                            {formatReportPercent(subject.attendance_rate)}
                          </td>
                          <td className="px-3 py-3 text-right theme-muted">
                            {formatReportPercent(subject.assignment_completion_rate)}
                          </td>
                          <td className="px-3 py-3 text-right theme-muted">
                            {formatMasteryOrScore(subject)}
                          </td>
                          <td className="px-3 py-3 theme-muted">
                            {subject.summary_note || subject.note || 'No summary note yet.'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <SummaryInsightList
              title="Strongest Subjects"
              items={report.strongest_subjects}
              emptyMessage="No strong subject signals are available yet."
            />
            <SummaryInsightList
              title="Areas Needing Support"
              items={report.subjects_needing_support}
              emptyMessage="No support subjects are currently flagged."
            />
          </div>

          <Card>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold theme-text">Recommended Actions</h2>
            </div>
            {report.overall_recommendations.length === 0 ? (
              <p className="mt-4 text-sm theme-muted">
                No overall recommendations are available yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {report.overall_recommendations.map((recommendation) => (
                  <li
                    key={recommendation}
                    className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm theme-text"
                  >
                    {recommendation}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
