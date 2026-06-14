'use client';

import { Card } from '@/app/components/ui/Card';
import { CurriculumLifecycleBadge } from '@/app/core/components/curriculum/CurriculumLifecycleBadge';
import type { CurriculumDisableImpactSnapshot } from '@/app/core/types/academic';

function valueOrZero(value?: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function ImpactMetric({
  label,
  value,
}: {
  label: string;
  value?: number | null;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold text-gray-900">{valueOrZero(value)}</p>
    </div>
  );
}

export function CurriculumDisableImpactSummary({
  impact,
}: {
  impact: CurriculumDisableImpactSnapshot;
}) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Curriculum
            </p>
            <h3 className="mt-1 break-words text-lg font-semibold text-gray-900">{impact.curriculum_name}</h3>
            <p className="mt-1 break-words text-sm text-gray-500">
              {impact.curriculum_type}
            </p>
          </div>
          <CurriculumLifecycleBadge status={impact.offering_status} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ImpactMetric label="Affected cohorts" value={impact.academic_setup?.cohort_count} />
        <ImpactMetric label="Affected subjects" value={impact.academic_setup?.subject_count} />
        <ImpactMetric label="Affected cohort subjects" value={impact.academic_setup?.cohort_subject_count} />
        <ImpactMetric label="In-progress sessions" value={impact.sessions?.in_progress_count} />
        <ImpactMetric label="Scheduled future sessions" value={impact.sessions?.scheduled_future_count} />
        <ImpactMetric label="Incomplete attendance sessions" value={impact.sessions?.incomplete_attendance_count} />
        <ImpactMetric label="Draft lesson plans" value={impact.lesson_plans?.draft_count} />
        <ImpactMetric label="Ready lesson plans" value={impact.lesson_plans?.reviewed_ready_count} />
        <ImpactMetric label="Scheduled lesson plans" value={impact.lesson_plans?.scheduled_unused_count} />
        <ImpactMetric label="Open assessments" value={impact.assessments?.active_open_count} />
        <ImpactMetric label="Future-due assessments" value={impact.assessments?.future_due_count} />
        <ImpactMetric label="Partial-score assessments" value={impact.assessments?.partial_scores_count} />
        <ImpactMetric label="Active report policies" value={impact.reporting?.active_policy_count} />
        <ImpactMetric label="Stale grade summaries" value={impact.reporting?.grade_summaries_stale_count} />
        <ImpactMetric label="Affected instructors" value={impact.users?.affected_instructors?.length} />
      </div>
    </div>
  );
}
