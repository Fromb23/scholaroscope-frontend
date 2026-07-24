import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/academic/cohorts/InstructorMyCohortsPageContent.tsx'),
  'utf8',
);

describe('InstructorMyCohortsPageContent class-list contract', () => {
  it('builds academic-year filters from my teaching load data only', () => {
    const pageSource = source();

    expect(pageSource).not.toContain('useAcademicYears');
    expect(pageSource).toContain('cohortSubjectGroups.forEach');
    expect(pageSource).toContain('academic_year_id');
    expect(pageSource).toContain('academic_year_name');
    expect(pageSource).toContain('is_current_year');
  });

  it('uses class terminology and preserves class-list URL state in detail links', () => {
    const pageSource = source();

    expect(pageSource).toContain('getInstructorClassesLabel');
    expect(pageSource).toContain('pageTitle: classLabel');
    expect(pageSource).toContain("workflowStep: filteredGroups.length > 0 ? 'open_assigned_class' : 'await_assigned_classes'");
    expect(pageSource).toContain("new URLSearchParams({ returnTo: currentListHref })");
    expect(pageSource).toContain('buildClassDetailHref(group.cohort_id)');
    expect(pageSource).not.toContain('My Teaching Load');
    expect(pageSource).not.toContain('No teaching load found');
  });
});
