'use client';

import type { ReactNode } from 'react';
import { Activity, Layers3, Users } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import type {
  AssessmentCompletion,
  AttendanceSummary,
  CbcPerformance,
  CbcStudentResult,
  CbcStudentSection,
  GenericPerformance,
  GenericStudentSection,
  PerformanceSource,
  ReportAverageSummary,
  ReportCoverage,
  ReportingSource,
} from '@/app/core/types/reporting';
import {
  formatPercent,
  getAttendancePercentage,
  getCoverageEntries,
  getCurriculumTypeLabel,
  getPerformanceSourceLabel,
  getReportingStatusLabel,
} from '@/app/core/lib/reportingPresentation';
import { AssessmentCompletionSummary } from './AssessmentCompletionSummary';
import { CbcPerformanceSummary } from './CbcPerformanceSummary';
import { CbcStudentResultSummary } from './CbcStudentResultSummary';
import { CurriculumPerformanceBadge } from './CurriculumPerformanceBadge';
import { GenericPerformanceSummary } from './GenericPerformanceSummary';
import { GenericStudentResultSummary } from './GenericStudentResultSummary';
import { ReportingSourceState } from './ReportingSourceState';

interface CurriculumSubjectReportCardProps {
  heading: ReactNode;
  subheading?: ReactNode;
  reportingSource: ReportingSource;
  performanceSource?: PerformanceSource | null;
  curriculumType?: string | null;
  status?: string | null;
  note?: string | null;
  learnerCount?: number | null;
  averageAttendance?: number | null;
  attendance?: AttendanceSummary | ReportAverageSummary | null;
  coverage?: ReportCoverage | null;
  assessmentCompletion?: AssessmentCompletion | null;
  genericPerformance?: GenericPerformance | null;
  cbcPerformance?: CbcPerformance | null;
  genericStudent?: GenericStudentSection | null;
  cbcStudent?: CbcStudentSection | CbcStudentResult | null;
  canManageCbcReview?: boolean;
  onCbcReviewSaved?: () => void;
  averageGrade?: number | null;
  averageGradeNote?: string | null;
  actions?: ReactNode;
  footer?: ReactNode;
}

export function CurriculumSubjectReportCard({
  heading,
  subheading,
  reportingSource,
  performanceSource,
  curriculumType,
  status,
  note,
  learnerCount,
  averageAttendance,
  attendance,
  coverage,
  assessmentCompletion,
  genericPerformance,
  cbcPerformance,
  genericStudent,
  cbcStudent,
  canManageCbcReview = false,
  onCbcReviewSaved,
  averageGrade,
  averageGradeNote,
  actions,
  footer,
}: CurriculumSubjectReportCardProps) {
  const attendancePercentage = averageAttendance ?? getAttendancePercentage(attendance);
  const coverageEntries = getCoverageEntries(coverage);
  const hasKernelFacts = learnerCount != null || attendancePercentage != null || coverageEntries.length > 0;

  const body = reportingSource === 'generic'
    ? genericStudent
      ? <GenericStudentResultSummary generic={genericStudent} />
      : genericPerformance || averageGrade != null
        ? <GenericPerformanceSummary performance={genericPerformance} averageGrade={averageGrade} averageGradeNote={averageGradeNote} />
        : <ReportingSourceState reportingSource={reportingSource} status={status} note={note} />
    : reportingSource === 'cbc'
      ? cbcStudent
        ? (
          <CbcStudentResultSummary
            cbc={cbcStudent}
            canManageReview={canManageCbcReview}
            onReviewSaved={onCbcReviewSaved}
          />
        )
        : cbcPerformance
          ? <CbcPerformanceSummary performance={cbcPerformance} />
          : <ReportingSourceState reportingSource={reportingSource} status={status} note={note} />
      : <ReportingSourceState reportingSource={reportingSource} status={status} note={note} />;

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold text-gray-900">{heading}</div>
            <CurriculumPerformanceBadge reportingSource={reportingSource} />
            {status && (
              <Badge variant="default">{getReportingStatusLabel(status) ?? status}</Badge>
            )}
            {performanceSource && performanceSource !== reportingSource && (
              <Badge variant="indigo">Results: {getPerformanceSourceLabel(performanceSource)}</Badge>
            )}
            {getCurriculumTypeLabel(curriculumType) && (
              <Badge variant="purple">{getCurriculumTypeLabel(curriculumType)}</Badge>
            )}
          </div>
          {subheading && (
            <div className="mt-1 text-sm text-gray-500">{subheading}</div>
          )}
        </div>
        {actions && (
          <div className="shrink-0">{actions}</div>
        )}
      </div>

      {hasKernelFacts && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {learnerCount != null && (
            <KernelMetric icon={Users} label="Learners" value={String(learnerCount)} />
          )}
          {attendancePercentage != null && (
            <KernelMetric icon={Activity} label="Attendance" value={formatPercent(attendancePercentage)} />
          )}
          {coverageEntries.slice(0, 2).map((entry) => (
            <KernelMetric key={entry.label} icon={Layers3} label={entry.label} value={entry.value} />
          ))}
        </div>
      )}

      {assessmentCompletion && (
        <AssessmentCompletionSummary completion={assessmentCompletion} />
      )}

      <div>{body}</div>

      {reportingSource !== 'cambridge_pending' && reportingSource !== 'unsupported' && note && (
        <p className="text-xs text-gray-500">{note}</p>
      )}

      {footer}
    </Card>
  );
}

function KernelMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 px-3 py-2">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}
