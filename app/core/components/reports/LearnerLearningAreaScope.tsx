import { BookOpenCheck } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { formatReportPercent } from '@/app/core/components/reports/ReportSummaryPrimitives';
import type { LearnerTermProgressLearningArea } from '@/app/core/types/reporting';
import type { ReactNode } from 'react';

function statusVariant(status: string | null | undefined): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'FINAL' || normalized === 'ASSESSED') return 'success';
  if (normalized === 'PROVISIONAL' || normalized === 'READY_FOR_REVIEW') return 'warning';
  if (normalized === 'STALE' || normalized === 'RECALCULATION_REQUIRED') return 'danger';
  if (['NO_EVIDENCE', 'AWAITING_EVIDENCE', 'TAUGHT_NOT_OBSERVED', 'NOT_TAUGHT'].includes(normalized)) return 'info';
  return 'default';
}

function label(value: string | null | undefined): string {
  return String(value ?? '').replace(/_/g, ' ').replace(/-/g, ' ').trim() || 'Not available';
}

export function LearnerLearningAreaScope({
  areas,
  selectedCohortSubjectId,
  onChange,
  selectedDetail,
}: {
  areas: LearnerTermProgressLearningArea[];
  selectedCohortSubjectId: number | null;
  onChange: (value: string) => void;
  selectedDetail: ReactNode;
}) {
  return (
    <section aria-labelledby="learning-areas" className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-[color:var(--color-primary)]" />
          <h2 id="learning-areas" className="text-xl font-semibold theme-text">Learning Areas</h2>
        </div>
        <div className="w-full md:max-w-sm">
          <Select
            label="Subject scope"
            value={selectedCohortSubjectId ? String(selectedCohortSubjectId) : ''}
            onChange={(event) => onChange(event.target.value)}
            options={[
              { value: '', label: 'All subjects / workspace overview' },
              ...areas.map((area) => ({
                value: String(area.cohort_subject_id),
                label: `${area.name}${area.code ? ` (${area.code})` : ''}`,
              })),
            ]}
          />
        </div>
      </div>
      {selectedCohortSubjectId ? selectedDetail : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {areas.map((area) => (
            <Card key={area.cohort_subject_id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-semibold theme-text">{area.name}</h3><p className="mt-1 text-sm theme-muted">{area.code}</p></div>
                <Badge variant={statusVariant(area.performance.status)}>{label(area.performance.status)}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><p className="theme-subtle">Attendance</p><p className="font-medium theme-text">{formatReportPercent(area.attendance.percentage)}</p></div>
                <div><p className="theme-subtle">Evidence</p><p className="font-medium theme-text">{area.evidence_summary.total}</p></div>
                <div><p className="theme-subtle">Observed</p><p className="font-medium theme-text">{area.coverage.observed}/{area.coverage.selected}</p></div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => onChange(String(area.cohort_subject_id))}>Inspect subject</Button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
