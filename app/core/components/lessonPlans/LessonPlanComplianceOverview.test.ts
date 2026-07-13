import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/lessonPlans/LessonPlanComplianceOverview.tsx'),
  'utf8',
);

describe('LessonPlanComplianceOverview', () => {
  it('uses the compliance endpoint and instructor progress sessions drill-down route', () => {
    expect(source).toContain('Lesson Plan Review');
    expect(source).toContain('useLessonPlanCompliance');
    expect(source).toContain("value: 'week', label: 'This Week'");
    expect(source).toContain("source: 'lesson-plan-review'");
    expect(source).toContain('#sessions');
    expect(source).not.toContain('#lesson-plans');
    expect(source).toContain('Search teacher');
  });

  it('preserves active review filters and pagination in returnTo', () => {
    expect(source).toContain('const currentReviewHref = useMemo');
    expect(source).toContain('new URLSearchParams(searchParams.toString())');
    expect(source).toContain("next.set('term_id', termId)");
    expect(source).toContain("next.set('window', next.get('window') || windowValue || 'week')");
    expect(source).toContain("returnTo: reviewReturnTo");
    expect(source).toContain("params.set('review_subject_id', subjectId)");
    expect(source).toContain("params.set('review_cohort_id', cohortId)");
    expect(source).toContain("params.set('review_start_date', data.window.start_date)");
    expect(source).toContain("params.set('review_end_date', data.window.end_date)");
  });
});
