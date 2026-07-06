import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/plugins/schemes/components/SchemeDetailPage.tsx'),
  'utf8',
);

describe('SchemeDetailPage lesson-plan desire path', () => {
  it('links to lesson plans filtered by scheme class subject and term with return state', () => {
    expect(source).toContain('filteredLessonPlansHref');
    expect(source).toContain("cohort_subject: String(scheme.cohort_subject)");
    expect(source).toContain("term: String(scheme.term)");
    expect(source).toContain('returnTo: currentReturnTo');
    expect(source).toContain('Lesson plans');
  });
});
