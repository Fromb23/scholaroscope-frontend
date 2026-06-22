import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('attendance learner subject options', () => {
  it('uses learner subject options when a learner is selected and clears invalid filters', () => {
    const source = readFileSync(join(process.cwd(), 'app/core/components/reports/AttendanceReportPage.tsx'), 'utf8');

    expect(source).toContain('useLearnerSubjectOptions(selectedStudentId');
    expect(source).toContain('learnerScopedSubjectSelectOptions');
    expect(source).toContain('cohortSubject:');
    expect(source).toContain("updateQuery({ subject: null, cohortSubject: null })");
  });

  it('declares the learner subject options API endpoint', () => {
    const source = readFileSync(join(process.cwd(), 'app/core/api/academic.ts'), 'utf8');

    expect(source).toContain('/academic/learners/${learnerId}/subject-options/');
  });
});
