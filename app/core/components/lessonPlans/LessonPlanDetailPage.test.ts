import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/lessonPlans/LessonPlanDetailPage.tsx'),
  'utf8',
);

describe('LessonPlanDetailPage scheme desire path', () => {
  it('links back to an originating scheme only when the payload carries a scheme id', () => {
    expect(source).toContain('getOriginatingSchemeId');
    expect(source).toContain('context?.scheme_id ?? context?.scheme');
    expect(source).toContain('originatingSchemeHref');
    expect(source).toContain("returnTo: currentReturnTo");
    expect(source).toContain('Open scheme');
  });

  it('uses the shared report export hook for PDF downloads', () => {
    expect(source).toContain('useReportExport');
    expect(source).not.toContain('handleExportPdf');
  });

  it('requires explicit review editing before scheduling a generated lesson', () => {
    expect(source).toContain('Review / edit lesson plan');
    expect(source).toContain('REVIEW_SECTION_FIELDS');
    expect(source).toContain('Scholaroscope-generated lesson plans are drafts');
    expect(source).toContain('System-controlled material');
    expect(source).toContain('Complete review');
    expect(source).toContain('await markReviewed(reviewForm)');
  });

  it('keeps all six required teaching sections in the review form', () => {
    [
      'Introduction',
      'Lesson development',
      'Learner activities',
      'Assessment strategy',
      'Differentiation',
      'Conclusion',
    ].forEach((label) => {
      expect(source).toContain(label);
    });
  });
});
