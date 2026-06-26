import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/academic/cohorts/CohortStudentsPage.tsx'),
  'utf8',
);

describe('cohort class learner links', () => {
  it('exposes class-context learner creation from the class list', () => {
    expect(source).toContain('Create learner');
    expect(source).toContain('buildLearnerCreateHref');
    expect(source).toContain('returnTo: `/academic/cohorts/${cohortId}`');
  });

  it('uses class-aware learner profile links from the class list', () => {
    expect(source).toContain('buildClassLearnerProfileHref(student.id, cohortId)');
  });
});
