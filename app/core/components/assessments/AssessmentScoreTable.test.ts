import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/assessments/AssessmentScoreTable.tsx'),
  'utf8',
);

describe('AssessmentScoreTable learner reporting links', () => {
  it('routes learner names to learner assessment reporting instead of learner profile', () => {
    const tableSource = source();

    expect(tableSource).toContain('buildLearnerAssessmentReportHref');
    expect(tableSource).toContain('href={buildLearnerHref(row.student)}');
    expect(tableSource).not.toContain('href={`/learners/${row.student}`}');
  });

  it('does not expand assessment score rows from a separate learner source', () => {
    const detailHookSource = readFileSync(
      join(process.cwd(), 'app/core/hooks/assessments/useAssessmentDetailPage.ts'),
      'utf8',
    );

    expect(detailHookSource).toContain('useAssessmentScores({');
    expect(detailHookSource).toContain('assessment: assessmentId');
    expect(detailHookSource).not.toContain('useLearners');
    expect(detailHookSource).not.toContain('learnersAPI');
    expect(detailHookSource).not.toContain('attendanceRecords');
  });

  it('passes term-scoped cohort subject context and returnTo into the learner assessment report link', () => {
    const tableSource = source();

    expect(tableSource).toContain('cohortSubjectId: assessment.cohort_subject');
    expect(tableSource).toContain('termId: assessment.term');
    expect(tableSource).toContain('subjectId: assessment.subject_id');
    expect(tableSource).toContain('cohortId: assessment.cohort_id');
    expect(tableSource).toContain('returnTo');
    expect(tableSource).not.toContain('assessmentId: assessment.id');
    expect(tableSource).not.toContain('assessmentType: assessment.assessment_type');
  });
});
