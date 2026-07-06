import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/academic/cohortSubjects/CohortSubjectLearnersPage.tsx'),
  'utf8',
);

describe('cohort subject learner links', () => {
  it('exposes learner creation with cohort subject context', () => {
    expect(source).toContain('Add learner to this class');
    expect(source).toContain('cohortSubjectId');
    expect(source).toContain('buildLearnerCreateHref');
  });

  it('uses subject-anchor profile links from subject learner lists', () => {
    expect(source).toContain('buildClassSubjectLearnerProfileHref');
    expect(source).toContain('learnerData.cohort_id');
    expect(source).toContain('cohortSubjectId');
  });

  it('uses instructor subject-report desire paths with return state', () => {
    expect(source).toContain('shouldUseInstructorReportSurface');
    expect(source).toContain('buildLearnerSubjectReportHref');
    expect(source).toContain('{ returnTo: currentReturnTo }');
  });
});
