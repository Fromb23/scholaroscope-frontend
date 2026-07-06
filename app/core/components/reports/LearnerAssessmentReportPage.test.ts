import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/reports/LearnerAssessmentReportPage.tsx'),
  'utf8',
);

describe('LearnerAssessmentReportPage state handling', () => {
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
