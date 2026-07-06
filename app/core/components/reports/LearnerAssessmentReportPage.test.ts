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

  it('keeps child filter params when academic year changes', () => {
    const pageSource = source();

    expect(pageSource).toContain('const nextParams = new URLSearchParams(searchParams.toString())');
    expect(pageSource).toContain("onChange={(event) => onChange({ academic_year: event.target.value ? Number(event.target.value) : null })}");
    expect(pageSource).not.toContain("nextParams.delete('term')");
    expect(pageSource).not.toContain("nextParams.delete('cohort_subject')");
  });

  it('uses returnTo for the contextual back button', () => {
    const pageSource = source();

    expect(pageSource).toContain("returnTo.startsWith('/assessments/') ? 'Back to assessment' : 'Back'");
    expect(pageSource).toContain('<Link href={returnTo}>');
  });

  it('preserves assessment and returnTo while replacing filter state', () => {
    const pageSource = source();

    expect(pageSource).toContain("nextParams.set('assessment', String(assessmentId))");
    expect(pageSource).toContain("nextParams.set('returnTo', returnTo)");
    expect(pageSource).toContain('router.replace');
  });

  it('keeps instructor visibility copy scoped to assigned subjects', () => {
    const pageSource = source();

    expect(pageSource).toContain('Only your assigned subject scopes are shown');
    expect(pageSource).not.toContain('all subjects are shown');
  });
});
