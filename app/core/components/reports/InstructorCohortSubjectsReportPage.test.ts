import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/reports/InstructorCohortSubjectsReportPage.tsx'),
  'utf8',
);

describe('My Class Subjects report list', () => {
  it('starts from URL-controlled collapsed summaries and loads one selected detail', () => {
    const page = source();

    expect(page).toContain("searchParams.get('expanded_cohort_subject')");
    expect(page).toContain('expandedCohortSubjectId: expandedId');
    expect(page).toContain('<ControlledReportAccordion');
    expect(page).toContain('item.detail_loaded ? <CurriculumSubjectReportCard');
  });

  it('carries the selected list state into the canonical class-subject report', () => {
    const page = source();

    expect(page).toContain('buildReportReturnTo(pathname, searchParams.toString())');
    expect(page).toContain('buildCohortSubjectReportHref(item.id');
    expect(page).toContain("authorityMode: 'teaching'");
    expect(page).toContain('returnTo: currentReturnTo');
  });
});
