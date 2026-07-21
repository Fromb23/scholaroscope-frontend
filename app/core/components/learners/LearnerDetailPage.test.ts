import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/learners/LearnerDetailPage.tsx'),
  'utf8',
);

describe('LearnerDetailPage instructor-safe loading', () => {
  it('keeps the base learner request independent from optional sections', () => {
    const pageSource = source();

    expect(pageSource).toContain('useStudent(studentId)');
    expect(pageSource).toContain("sectionState.attendance ? studentId : null");
    expect(pageSource).toContain('canGenerateSubjectReport && sectionState.reports');
    expect(pageSource).toContain('canRecordAssessment && sectionState.assessment');
  });

  it('does not call management cohort hooks for ordinary instructor rendering', () => {
    const pageSource = source();

    expect(pageSource).toContain('useCohorts(undefined, { enabled: canManage && enrollOpen })');
    expect(pageSource).toContain('canManageSubjectParticipation && sectionState.subjectParticipation ? currentCohortId : null');
    expect(pageSource).toContain('Subject enrollment changes require learner-management permission');
  });
});
