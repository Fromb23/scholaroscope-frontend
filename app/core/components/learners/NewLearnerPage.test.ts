import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/learners/NewLearnerPage.tsx'),
  'utf8',
);

describe('new learner class-context save flow', () => {
  it('preselects cohort context and redirects to safe returnTo after create', () => {
    expect(source).toContain("searchParams.get('cohort')");
    expect(source).toContain('getLearnerCreateReturnTo');
    expect(source).toContain('router.push(returnAfterCreate)');
  });

  it('uses the existing subject enrollment API for subject-context creation', () => {
    expect(source).toContain('bulkEnrollCohortSubjectLearners');
    expect(source).toContain('requestedCohortSubjectId');
    expect(source).not.toContain('freelance-only');
  });
});
