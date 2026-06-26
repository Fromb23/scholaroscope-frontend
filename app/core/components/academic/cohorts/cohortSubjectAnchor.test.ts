import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('cohort subject anchor return', () => {
  it('scrolls subject anchors after cohort subject data finishes loading', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/academic/cohorts/CohortDetailPage.tsx'),
      'utf8',
    );

    expect(source).toContain("window.location.hash.slice(1)");
    expect(source).toContain("document.getElementById(targetId)?.scrollIntoView");
    expect(source).toContain('cohortSubjectsLoading');
    expect(source).toContain('subjectParticipationQuery.loading');
  });
});
