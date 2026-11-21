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

  it('renders incomplete cohorts without requiring fake subject assignments', () => {
    const pageSource = source();
    const hookSource = readFileSync(
      join(process.cwd(), 'app/core/hooks/useInstructorMyCohorts.ts'),
      'utf8',
    );

    expect(hookSource).toContain('cohortAssignments.forEach((assignment) => {');
    expect(hookSource).toContain('subjects: []');
    expect(hookSource).toContain("setup_status: assignment.setup_status ?? ((subjectCount ?? 0) > 0 ? 'READY' : 'INCOMPLETE')");
    expect(pageSource).toContain('Setup incomplete');
    expect(pageSource).toContain("group.setup_incomplete_reason ?? 'No class subjects configured.'");
    expect(pageSource).toContain('Complete class-subject setup');
  });

  it('renders one compact class card with one class learner count and collapsed subjects', () => {
    const pageSource = source();

    expect(pageSource).toContain('<Card key={group.cohort_id}>');
    expect(pageSource).toContain("group.learner_count === 1 ? '' : 's'");
    expect(pageSource).toContain('group.subjects.length === 1');
    expect(pageSource).toContain('<details>');
    expect(pageSource).toContain('{group.subjects.length} subjects');
    expect(pageSource).toContain('Class overview');
    expect(pageSource).not.toContain('View Learners');
    expect(pageSource).not.toContain('Cohort Learners:');
  });
});
