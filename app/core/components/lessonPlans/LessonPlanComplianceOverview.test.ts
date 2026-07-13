import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('LessonPlanComplianceOverview', () => {
  it('uses the compliance endpoint and instructor progress drill-down route', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/lessonPlans/LessonPlanComplianceOverview.tsx'),
      'utf8',
    );

    expect(source).toContain('Lesson Plan Review');
    expect(source).toContain('useLessonPlanCompliance');
    expect(source).toContain("value: 'week', label: 'This Week'");
    expect(source).toContain('/admin/instructors/${row.instructor_id}/progress#lesson-plans');
    expect(source).toContain('Search teacher');
  });
});
