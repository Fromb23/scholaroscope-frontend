import { type ReactNode } from 'react';
import { Target } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import type {
  LearnerReportLatestEvidence,
  LearnerReportMetricItem,
  LearnerReportStrandSummary,
  LearnerSubjectReportKeyIndicator,
  ReportRiskLevel,
} from '@/app/core/types/reporting';

export function formatPercent(value: number | null | undefined): string {
  return value == null ? '-' : `${value.toFixed(1)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString();
}

export function riskVariant(riskLevel: ReportRiskLevel): 'success' | 'warning' | 'danger' {
  if (riskLevel === 'LOW') {
    return 'success';
  }
  if (riskLevel === 'MEDIUM') {
    return 'warning';
  }
  return 'danger';
}

export function participationLabel(status: string | null | undefined): string {
  switch (status) {
    case 'NOT_IN_SCOPE':
      return 'Not enrolled during this term';
    case 'NOT_ADMITTED_YET':
      return 'Not admitted during this term';
    case 'NOT_ENROLLED_IN_COHORT':
      return 'Not enrolled in this class during this term';
    case 'NOT_ENROLLED_IN_SUBJECT':
      return 'Not enrolled in this subject during this term';
    case 'JOINED_DURING_TERM':
      return 'Joined during this term';
    case 'LEFT_DURING_TERM':
      return 'Left during this term';
    case 'IN_SCOPE':
      return 'In scope for this term';
    default:
      return status ? status.replace(/_/g, ' ') : 'Term participation';
  }
}

function indicatorToneClass(tone: LearnerSubjectReportKeyIndicator['tone']): string {
  if (tone === 'success') {
    return 'theme-success-surface';
  }
  if (tone === 'warning') {
    return 'theme-warning-surface';
  }
  return 'theme-danger-surface';
}

export function SubjectMetricCard({ indicator }: { indicator: LearnerSubjectReportKeyIndicator }) {
  return (
    <div className={`rounded-lg p-4 ${indicatorToneClass(indicator.tone)}`}>
      <p className="text-sm font-medium theme-muted">{indicator.label}</p>
      <p className="mt-2 text-2xl font-semibold theme-text">{indicator.value}</p>
      <p className="mt-1 text-sm theme-subtle">{indicator.note}</p>
    </div>
  );
}

export function MetricList({
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
      <h2 className="text-lg font-semibold theme-text">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm theme-muted">{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <div key={`${title}-${item.type}-${item.label}`} className="rounded-lg border theme-border theme-surface-muted p-4">
              <p className="font-medium theme-text">{item.label}</p>
              <p className="mt-1 text-sm theme-muted">{item.metric}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export function StrandTable({ rows }: { rows: LearnerReportStrandSummary[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 theme-subtle" />
        <h2 className="text-lg font-semibold theme-text">Strand Progress</h2>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm theme-muted">No strand progress has been recorded yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
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
                <tr key={`${row.strand_code}-${row.strand_name}`} className="border-b theme-border">
                  <td className="px-3 py-3">
                    <div className="font-medium theme-text">{row.strand_name}</div>
                    <div className="text-xs theme-subtle">{row.strand_code}</div>
                  </td>
                  <td className="px-3 py-3 text-right theme-muted">{row.selected_outcomes}</td>
                  <td className="px-3 py-3 text-right theme-muted">{row.taught_outcomes}</td>
                  <td className="px-3 py-3 text-right theme-muted">{row.mastered_outcomes}</td>
                  <td className="px-3 py-3 text-right theme-muted">{formatPercent(row.coverage_percentage)}</td>
                  <td className="px-3 py-3 text-right theme-muted">{formatPercent(row.mastery_percentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function BarListChart({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: Array<{
    key: string;
    label: string;
    value: string;
    percent: number;
    helper?: string;
  }>;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold theme-text">{title}</h2>
      </div>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.key} className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <div>
                <p className="font-medium theme-text">{item.label}</p>
                {item.helper ? <p className="theme-subtle">{item.helper}</p> : null}
              </div>
              <span className="shrink-0 theme-muted">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full theme-surface-muted">
              <div
                className="h-full rounded-full bg-[color:var(--color-primary)]"
                style={{ width: `${Math.max(0, Math.min(item.percent, 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function KeyValueTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold theme-text">{title}</h2>
      <div className="mt-4 divide-y theme-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-3 text-sm">
            <span className="theme-muted">{row.label}</span>
            <span className="text-right font-medium theme-text">{row.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function LatestEvidenceTable({ rows }: { rows: LearnerReportLatestEvidence[] }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold theme-text">Latest Evidence</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm theme-muted">No evidence rows are available yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b theme-border text-left text-xs uppercase tracking-wide theme-subtle">
                <th className="px-3 py-2">Observed</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Evaluation</th>
                <th className="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.observed_at}-${row.learning_outcome_code}`} className="border-b theme-border">
                  <td className="px-3 py-3 theme-muted">{formatDate(row.observed_at)}</td>
                  <td className="px-3 py-3 theme-text">{row.learning_outcome_code}</td>
                  <td className="px-3 py-3 theme-muted">{row.learning_outcome_description}</td>
                  <td className="px-3 py-3 theme-muted">{row.evaluation_type}</td>
                  <td className="px-3 py-3 theme-muted">{row.source_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
