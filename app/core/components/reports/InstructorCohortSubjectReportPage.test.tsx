import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/reports/InstructorCohortSubjectReportPage.tsx'),
  'utf8',
);

describe('Instructor cohort-subject Attendance projection', () => {
  it('links the session title and Action column to the existing detail route', () => {
    const component = source();

    expect(component).toContain('<TableHead>Action</TableHead>');
    expect(component).toContain('buildSessionDetailHref(session.id');
    expect(component).toContain("section: 'attendance'");
    expect(component).toContain('authorityMode,');
    expect(component).toContain('returnTo: currentReturnTo');
    expect(component).toContain("exactReportParams.set('authority_mode', authorityMode)");
    expect(component).toContain('href={sessionHref}');
    expect(component).toContain('View attendance');
  });
});
