'use client';

import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import type {
  ReportCardTone,
  ReportRiskLevel,
  SubjectSummaryStatus,
  TeacherVisibilityStatus,
} from '@/app/core/types/reporting';

export function formatReportPercent(value: number | null | undefined): string {
  return value == null ? 'No data yet' : `${value.toFixed(1)}%`;
}

export function formatReportDate(value: string | null | undefined): string {
  if (!value) {
    return 'No date yet';
  }
  return new Date(value).toLocaleDateString();
}

export function toneToBadgeVariant(tone: ReportCardTone) {
  if (tone === 'success') return 'success' as const;
  if (tone === 'warning') return 'warning' as const;
  if (tone === 'danger') return 'danger' as const;
  return 'default' as const;
}

export function toneToSurfaceClass(tone: ReportCardTone): string {
  if (tone === 'success') return 'theme-success-surface';
  if (tone === 'warning') return 'theme-warning-surface';
  if (tone === 'danger') return 'theme-danger-surface';
  return 'theme-surface-muted';
}

export function riskTone(riskLevel: ReportRiskLevel): ReportCardTone {
  if (riskLevel === 'LOW') return 'success';
  if (riskLevel === 'MEDIUM') return 'warning';
  return 'danger';
}

export function friendlyRiskLabel(riskLevel: ReportRiskLevel): string {
  if (riskLevel === 'LOW') return 'On track';
  if (riskLevel === 'MEDIUM') return 'Watch';
  return 'Needs support';
}

export function friendlySubjectStatusLabel(status?: SubjectSummaryStatus | null): string {
  if (status === 'ON_TRACK') return 'On track';
  if (status === 'WATCH') return 'Watch';
  if (status === 'NEEDS_SUPPORT') return 'Needs support';
  return 'No data yet';
}

export function subjectStatusTone(status?: SubjectSummaryStatus | null): ReportCardTone {
  if (status === 'ON_TRACK') return 'success';
  if (status === 'WATCH') return 'warning';
  if (status === 'NEEDS_SUPPORT') return 'danger';
  return 'neutral';
}

export function friendlyTeacherStatusLabel(status?: TeacherVisibilityStatus | null): string {
  if (status === 'STRONG') return 'Strong';
  if (status === 'WATCH') return 'Watch';
  if (status === 'NEEDS_ACTION') return 'Needs action';
  return 'No data yet';
}

export function teacherStatusTone(status?: TeacherVisibilityStatus | null): ReportCardTone {
  if (status === 'STRONG') return 'success';
  if (status === 'WATCH') return 'warning';
  if (status === 'NEEDS_ACTION') return 'danger';
  return 'neutral';
}

export function ReportMetricCard({
  label,
  value,
  note,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  note: string;
  tone?: ReportCardTone;
}) {
  return (
    <Card className={`p-5 ${toneToSurfaceClass(tone)}`}>
      <p className="text-sm font-medium theme-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold theme-text">{value}</p>
      <p className="mt-2 text-sm theme-subtle">{note}</p>
    </Card>
  );
}

export function ReportStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: ReportCardTone;
}) {
  return <Badge variant={toneToBadgeVariant(tone)}>{label}</Badge>;
}
