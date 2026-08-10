import Link from 'next/link';

import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { formatDate, formatPercent } from '@/app/core/components/reports/LearnerSubjectReportPresentation';
import { buildAssessmentDetailHref } from '@/app/core/lib/operationalDetailNavigation';
import type { LearnerAssessmentReportRow } from '@/app/core/types/reporting';

function scoreValue(row: LearnerAssessmentReportRow): string {
  if (row.score != null && row.total_marks != null) return `${row.score}/${row.total_marks}`;
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

export function LearnerAssessmentRowsTable({ rows, returnTo }: {
  rows: LearnerAssessmentReportRow[];
  returnTo: string;
}) {
  if (rows.length === 0) {
    return <Card><p className="text-sm theme-muted">No assessment scores match the selected context.</p></Card>;
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full divide-y theme-border text-sm">
          <thead className="theme-surface-muted">
            <tr>
              {['Assessment', 'Date', 'Term', 'Subject', 'Score', 'Percentage', 'Status'].map((label) => (
                <th key={label} className="px-4 py-3 text-left font-medium theme-muted">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y theme-border">
            {rows.map((row) => (
              <tr key={`${row.assessment_id}-${row.cohort_subject_id}`}>
                <td className="px-4 py-3">
                  <Link href={buildAssessmentDetailHref(row.assessment_id, returnTo)} className="theme-link font-medium">
                    {row.assessment_name}
                  </Link>
                  <div className="mt-1 text-xs theme-subtle">{row.assessment_type_display}</div>
                </td>
                <td className="px-4 py-3 theme-muted">{formatDate(row.assessment_date)}</td>
                <td className="px-4 py-3 theme-muted">
                  {row.term_name ?? '-'}
                  {row.academic_year_name ? <span className="block text-xs theme-subtle">{row.academic_year_name}</span> : null}
                </td>
                <td className="px-4 py-3 theme-muted">
                  {row.subject_code} - {row.subject_name}
                  <span className="block text-xs theme-subtle">{row.cohort_name}</span>
                </td>
                <td className="px-4 py-3 theme-text">{scoreValue(row)}</td>
                <td className="px-4 py-3 theme-text">{row.percentage == null ? '-' : formatPercent(row.percentage)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(row.assessment_status)}>{row.assessment_status.replace(/_/g, ' ')}</Badge>
                    <Badge variant={statusVariant(row.score_status)}>{row.score_status_display}</Badge>
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
