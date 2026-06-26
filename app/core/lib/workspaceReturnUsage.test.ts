import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pages = [
  'app/core/components/lessonPlans/LessonPlansPage.tsx',
  'app/plugins/schemes/components/SchemesPage.tsx',
  'app/core/components/assessments/AssessmentsOverview.tsx',
  'app/core/components/reports/InstructorCohortSubjectReportPage.tsx',
];

describe('workspace return helper usage', () => {
  it('uses the shared back-label helper on cohort-subject return surfaces', () => {
    for (const page of pages) {
      const source = readFileSync(join(process.cwd(), page), 'utf8');
      expect(source).toContain('getReturnBackLabel');
    }
  });
});
