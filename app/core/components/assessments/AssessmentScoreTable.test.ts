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

  it('passes assessment context and returnTo into the learner assessment report link', () => {
    const tableSource = source();

    expect(tableSource).toContain('assessmentId: assessment.id');
    expect(tableSource).toContain('cohortSubjectId: assessment.cohort_subject');
    expect(tableSource).toContain('assessmentType: assessment.assessment_type');
    expect(tableSource).toContain('termId: assessment.term');
    expect(tableSource).toContain('subjectId: assessment.subject_id');
    expect(tableSource).toContain('cohortId: assessment.cohort_id');
    expect(tableSource).toContain('returnTo');
  });
});
