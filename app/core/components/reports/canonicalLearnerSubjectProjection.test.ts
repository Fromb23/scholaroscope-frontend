import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const canonicalSource = () =>
  readFileSync(
    join(process.cwd(), 'app/core/components/reports/CanonicalLearnerSubjectReportPage.tsx'),
    'utf8',
  );

const overviewSource = () =>
  readFileSync(
    join(process.cwd(), 'app/core/components/reports/LearnerSubjectReportPage.tsx'),
    'utf8',
  );

describe('canonical learner-subject report projection routing', () => {
  it('normalizes path-owned learner and cohort-subject query identities away', () => {
    const source = canonicalSource();

    expect(source).toContain('PATH_OWNED_QUERY_KEYS');
    expect(source).toContain("'cohort_subject'");
    expect(source).toContain("'student'");
    expect(source).toContain('next.delete(key)');
    expect(source).not.toContain("next.set('cohort_subject', String(cohortSubjectId))");
    expect(source).not.toContain("next.set('student', String(learnerId))");
  });

  it('switches subject scope by replacing the canonical route while preserving intent', () => {
    const source = overviewSource();

    expect(source).toContain('pathCohortSubjectId');
    expect(source).toContain('?? parsePositiveNumber');
    expect(source).toContain('buildLearnerSubjectReportHref(learnerId, cohortSubjectId');
    expect(source).toContain('projection');
    expect(source).toContain('termId');
    expect(source).toContain('authorityMode');
    expect(source).toContain('returnTo');
  });
});
