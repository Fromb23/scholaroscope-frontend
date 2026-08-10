import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/sessions/SessionSupervisionHierarchy.tsx'),
  'utf8',
);

describe('Lesson Supervision hierarchy contract', () => {
  it('loads cohorts and sessions only for valid opened branches', () => {
    const page = source();

    expect(page).toContain('useSupervisionSubjects(baseParams, true)');
    expect(page).toContain('useSupervisionCohorts(cohortParams, Boolean(cohortParams))');
    expect(page).toContain('useSupervisionSessions(sessionParams, Boolean(sessionParams))');
    expect(page).toContain("searchParams.get('supervision_subject')");
    expect(page).toContain("searchParams.get('supervision_cohort')");
  });

  it('uses accessible nested controls and preserves hierarchy in session return state', () => {
    const page = source();

    expect(page.match(/aria-expanded=/g)?.length).toBe(2);
    expect(page.match(/aria-controls=/g)?.length).toBe(2);
    expect(page).toContain('buildReportReturnTo(pathname, searchParams.toString())');
    expect(page).toContain('returnTo,');
  });
});
