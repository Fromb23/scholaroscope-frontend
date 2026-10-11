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

  it('keeps internal request actions behind backend workspace governance', () => {
    expect(source).toContain('shouldShowInternalRequestActions');
    expect(source).toContain('showInternalRequestActions');
    expect(source).toContain('canManagePlacement || showInternalRequestActions');
    expect(source).toContain('Create learner');
    expect(source).toContain('Request add learner');
  });

  it('renders direct placement routes separately for placement administrators', () => {
    expect(source).toContain("permission_keys?.includes('learners.manage_placement')");
    expect(source).toContain('/transfer?');
    expect(source).toContain('/unenroll?');
    expect(source).toContain('returnTo: rosterReturnTo');
  });
});
