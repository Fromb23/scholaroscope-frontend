'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ClipboardList, FileCheck2, Paperclip } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { EntityLoadingState, ReportPreparingState } from '@/app/components/ui/loading';
import { Select } from '@/app/components/ui/Select';
import { isSafeNextPath } from '@/app/core/auth/navigation';
import { useLearnerAssignmentReport } from '@/app/core/hooks/useReporting';
import { formatDate } from '@/app/core/components/reports/LearnerSubjectReportPresentation';
import type { AppError } from '@/app/core/errors';
import type { LearnerAssignmentReportRow } from '@/app/core/types/reporting';

function parsePositiveNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function valueOrDash(value: string | number | null | undefined): string {
  return value == null || value === '' ? '-' : String(value);
}

function evaluationValue(row: LearnerAssignmentReportRow): string {
  if (row.numeric_score != null && row.total_marks != null) return `${row.numeric_score}/${row.total_marks}`;
  if (row.numeric_score != null) return String(row.numeric_score);
  if (row.rubric_level_label || row.rubric_level_code) {
    return [row.rubric_level_label, row.rubric_level_code].filter(Boolean).join(' ');
  }
  if (row.competency_state) return row.competency_state;
  return row.evaluation_value ?? '-';
}

function attachmentSummary(metadata: unknown[]): string {
  if (!metadata.length) return 'No attachment metadata';
  return `${metadata.length} attachment metadata item${metadata.length === 1 ? '' : 's'}`;
}

const learnerAssignmentReportError = (message: string): AppError => ({
  kind: 'report_not_ready',
  title: 'This learner assignment report is not ready yet.',
  message,
  retryable: true,
  severity: 'warning',
  actionLabel: 'Try again',
});

function RowCard({ row, highlighted }: { row: LearnerAssignmentReportRow; highlighted: boolean }) {
  return (
    <Card className={highlighted ? 'ring-2 ring-blue-500' : undefined}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold theme-text">{row.assignment_title}</h2>
              <Badge variant={row.delivery_mode === 'GROUP' ? 'purple' : 'blue'} size="sm">
                {row.delivery_mode === 'GROUP' ? 'Group' : 'Individual'}
              </Badge>
              {row.submission_status ? (
                <Badge variant={row.submission_status === 'REVIEWED' ? 'green' : 'default'} size="sm">
                  {row.submission_status}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm theme-muted">
              {row.subject_code} - {row.subject_name} · {row.cohort_name}
            </p>
          </div>
          <div className="text-sm theme-muted md:text-right">
            <div>Due {row.due_at ? formatDate(row.due_at) : 'not set'}</div>
            <div>Submitted {row.submitted_at ? formatDate(row.submitted_at) : 'not submitted'}</div>
          </div>
        </div>

        {row.group_name ? (
          <div className="rounded-lg border theme-border theme-surface-muted px-4 py-3 text-sm">
            <div className="font-medium theme-text">{row.group_name}</div>
            <div className="theme-muted">
              Participation: {valueOrDash(row.group_member_participation_status)}
              {row.group_member_participation_note ? ` · ${row.group_member_participation_note}` : ''}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border theme-border theme-surface-muted p-4">
            <div className="flex items-center gap-2 text-sm font-medium theme-text">
              <ClipboardList className="h-4 w-4" />
              Response
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm theme-muted">
              {row.response_note || 'No response note recorded.'}
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs theme-subtle">
              <Paperclip className="h-3.5 w-3.5" />
              {attachmentSummary(row.attachment_metadata)}
            </p>
          </div>

          <div className="rounded-lg border theme-border theme-surface-muted p-4">
            <div className="flex items-center gap-2 text-sm font-medium theme-text">
              <FileCheck2 className="h-4 w-4" />
              Evaluation
            </div>
            <dl className="mt-2 grid gap-1 text-sm">
              <div className="flex justify-between gap-3"><dt className="theme-muted">Type</dt><dd className="theme-text">{row.evaluation_type}</dd></div>
              <div className="flex justify-between gap-3"><dt className="theme-muted">Value</dt><dd className="theme-text">{evaluationValue(row)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="theme-muted">Evidence</dt><dd className="theme-text">{valueOrDash(row.evidence_status)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="theme-muted">Evaluated</dt><dd className="theme-text">{row.evaluated_at ? formatDate(row.evaluated_at) : '-'}</dd></div>
            </dl>
            {row.narrative || row.feedback ? (
              <p className="mt-3 whitespace-pre-wrap text-sm theme-muted">{row.narrative || row.feedback}</p>
            ) : null}
            {row.evidence_warning ? (
              <p className="mt-2 text-sm text-amber-700">Evidence warning: {row.evidence_warning}</p>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function LearnerAssignmentReportPage() {
  const params = useParams<{ learnerId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const learnerId = Number(params.learnerId);
  const cohortSubjectId = parsePositiveNumber(searchParams.get('cohort_subject'));
  const highlightAssignment = parsePositiveNumber(searchParams.get('highlightAssignment'));
  const returnTo = isSafeNextPath(searchParams.get('returnTo'))
    ? searchParams.get('returnTo')!
    : '/reports';
  const { report, loading, error, errorStatus, refetch } = useLearnerAssignmentReport(
    Number.isInteger(learnerId) && learnerId > 0 ? learnerId : null,
    { cohortSubjectId },
  );

  const subjectOptions = useMemo(() => [
    { value: '', label: 'All visible subjects' },
    ...(report?.available_filters.cohort_subjects ?? []).map((scope) => ({
      value: String(scope.cohort_subject_id),
      label: `${scope.subject_code} - ${scope.subject_name} (${scope.cohort_name})`,
    })),
  ], [report?.available_filters.cohort_subjects]);

  const updateSubject = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set('cohort_subject', value);
    else next.delete('cohort_subject');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  if (!Number.isInteger(learnerId) || learnerId <= 0) {
    return <AppErrorBanner error={learnerAssignmentReportError('Invalid learner report route.')} />;
  }

  if (loading) {
    return <EntityLoadingState entity="learner assignment report" action="Loading" />;
  }

  if (error) {
    if (errorStatus === 403 || errorStatus === 404) {
      return (
        <ReportPreparingState
          title="Assignment report unavailable"
          description={error}
        />
      );
    }
    return <AppErrorBanner error={learnerAssignmentReportError(error)} onDismiss={() => void refetch()} />;
  }

  if (!report) {
    return <ReportPreparingState title="No assignment report" description="No report payload was returned." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold theme-text">Learner Assignment Report</h1>
          <p className="theme-muted">
            {report.learner.name} · {report.learner.admission_number}
          </p>
          <p className="text-sm theme-subtle">
            {report.context.subject_name && report.context.cohort_name
              ? `${report.context.subject_name} · ${report.context.cohort_name}`
              : report.visibility.scope === 'admin'
                ? 'All authorized assignment subjects'
                : 'Authorized assignment subjects'}
          </p>
        </div>
        <Link href={returnTo}>
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><div className="text-sm theme-muted">Assignments</div><div className="mt-2 text-2xl font-semibold theme-text">{report.summary.assignment_count}</div></Card>
        <Card><div className="text-sm theme-muted">Submitted</div><div className="mt-2 text-2xl font-semibold theme-text">{report.summary.submitted_count}</div></Card>
        <Card><div className="text-sm theme-muted">Reviewed</div><div className="mt-2 text-2xl font-semibold theme-text">{report.summary.reviewed_count}</div></Card>
      </div>

      {report.visibility.can_compare_subjects ? (
        <Card>
          <Select
            label="Subject / cohort"
            value={cohortSubjectId?.toString() ?? ''}
            onChange={(event) => updateSubject(event.target.value)}
            options={subjectOptions}
          />
        </Card>
      ) : null}

      {report.assignment_rows.length === 0 ? (
        <Card>
          <div className="py-10 text-center text-sm theme-muted">
            No assignment records are available for this learner in the selected scope.
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {report.assignment_rows.map((row) => (
            <RowCard
              key={`${row.delivery_mode}:${row.assignment_id}:${row.submission_id ?? row.group_id ?? 'none'}`}
              row={row}
              highlighted={row.assignment_id === highlightAssignment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
