import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/academic/cohorts/InstructorMyCohortsPageContent.tsx'),
  'utf8',
);

describe('InstructorMyCohortsPageContent teaching-load contract', () => {
  it('builds academic-year filters from my teaching load data only', () => {
    const pageSource = source();

    expect(pageSource).not.toContain('useAcademicYears');
    expect(pageSource).toContain('cohortSubjectGroups.forEach');
    expect(pageSource).toContain('academic_year_id');
    expect(pageSource).toContain('academic_year_name');
    expect(pageSource).toContain('is_current_year');
  });
});
