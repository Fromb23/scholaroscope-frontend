import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('assessment cohort-subject return policy', () => {
  it('preserves source and return context when creating from a cohort subject', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/assessments/AssessmentsOverview.tsx'),
      'utf8',
    );

    expect(source).toContain("params.set('cohort_subject', String(selectedCohortSubject))");
    expect(source).toContain("params.set('source', 'cohort_subject')");
    expect(source).toContain("const backLabel = source === 'cohort_subject'");
    expect(source).toContain('getReturnBackLabel(safeReturnTo)');
  });
});
