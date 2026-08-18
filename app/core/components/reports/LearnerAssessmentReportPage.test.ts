import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/reports/LearnerAssessmentReportPage.tsx'),
  'utf8',
);

describe('LearnerAssessmentReportPage state handling', () => {
  it('renders hierarchy filters in parent-to-child DOM order', () => {
    const labels = Array.from(
      source().matchAll(/<Select\s+label="([^"]+)"/g),
      (match) => match[1],
    );

    expect(labels.slice(0, 4)).toEqual([
      'Academic Year',
      'Term',
      'Subject Scope',
      'Assessment Category',
    ]);
  });

  it('clears incompatible child scope when academic year or term changes', () => {
    const pageSource = source();

    expect(pageSource).toContain('const nextParams = new URLSearchParams(searchParams.toString())');
    expect(pageSource).toContain('academic_year: event.target.value ? Number(event.target.value) : null');
    expect(pageSource).toContain('cohort_subject: null');
    expect(pageSource).toContain('subject: null');
    expect(pageSource).toContain('cohort: null');
    expect(pageSource).toContain('subjectScopes={allowedSubjectScopes}');
  });

  it('uses returnTo for the contextual back button', () => {
    const pageSource = source();

    expect(pageSource).toContain("returnTo.startsWith('/assessments/') ? 'Back to assessment' : 'Back'");
    expect(pageSource).toContain('<Link href={returnTo}>');
  });

  it('preserves assessment and returnTo while replacing filter state', () => {
    const pageSource = source();

    expect(pageSource).toContain("useParams<{ learnerId: string; cohortSubjectId?: string }>()");
    expect(pageSource).toContain('pathCohortSubjectId');
    expect(pageSource).toContain('?? parsePositiveNumber');
    expect(pageSource).toContain('buildLearnerAssessmentReportHref(learnerId');
    expect(pageSource).toContain('authorityMode');
    expect(pageSource).toContain("nextParams.set('assessment', String(assessmentId))");
    expect(pageSource).toContain("nextParams.set('returnTo', returnTo)");
    expect(pageSource).toContain('router.replace');
  });

  it('links assessment names to the canonical assessment ID page with exact report state', () => {
    const pageSource = source();
    const tableSource = readFileSync(
      join(process.cwd(), 'app/core/components/reports/LearnerAssessmentRowsTable.tsx'),
      'utf8',
    );

    expect(pageSource).toContain('<LearnerAssessmentRowsTable');
    expect(tableSource).toContain('buildAssessmentDetailHref(row.assessment_id, returnTo)');
    expect(tableSource).toContain('<Link');
    expect(pageSource).toContain('buildReportReturnTo(pathname, searchParams.toString())');
  });

  it('keeps instructor visibility copy scoped to assigned subjects', () => {
    const pageSource = source();

    expect(pageSource).toContain('Only your assigned subject scopes are shown');
    expect(pageSource).not.toContain('all subjects are shown');
  });
});
