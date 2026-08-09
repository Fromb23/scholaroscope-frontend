import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () =>
  readFileSync(
    join(process.cwd(), 'app/core/components/reports/InstructorCohortSubjectReportPage.tsx'),
    'utf8',
  );

describe('canonical cohort-subject projections', () => {
  it('renders learners as table rows with a layout-matched loading table', () => {
    const page = source();
    expect(page).toContain('LEARNER_COLUMNS');
    expect(page).toContain('<TableRow key={row.student.id}>');
    expect(page).toContain('<ProjectionTableSkeleton columns={LEARNER_COLUMNS} />');
    expect(page).not.toContain('grid gap-4 md:grid-cols-2 xl:grid-cols-3');
  });

  it('renders assessment summaries and authorized assessment rows together', () => {
    const page = source();
    expect(page).toContain('performance.assessment_completion');
    expect(page).toContain('performance.assessment_items');
    expect(page).toMatch(
      /buildAssessmentDetailHref\(\s*assessment\.id,\s*currentReturnTo,?\s*\)/,
    );
  });

  it('links assignment rows through the existing assignment detail component', () => {
    const page = source();
    const assignments = readFileSync(
      join(process.cwd(), 'app/core/components/reports/ClassSubjectAssignmentParticipation.tsx'),
      'utf8',
    );
    expect(page).toContain('returnTo={currentReturnTo}');
    expect(assignments).toContain(
      'buildAssignmentDetailHref(cohortId, row.assignment_id, returnTo)',
    );
    expect(assignments).toContain('<TableHead>Action</TableHead>');
  });

  it('keeps Attendance inside the cohort-subject projection', () => {
    const page = source();
    expect(page).toContain("projection === 'attendance'");
    expect(page).toContain('activity.session_items');
    expect(page).not.toContain('buildAttendanceReportHref');
    expect(page).not.toContain('Open attendance detail');
  });

  it('loads scope-derived overview metadata for every projection', () => {
    const page = source();
    expect(page).toContain('useCanonicalCohortSubjectOverview(');
    expect(page).toMatch(
      /useCanonicalCohortSubjectOverview\([\s\S]*?authorityMode,[\s\S]*?validId,/,
    );
  });
});
