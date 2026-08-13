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

  it('passes explicit route authority mode to lesson plan detail fetches', () => {
    expect(source).toContain("const requestedAuthorityMode = searchParams.get('authority_mode')");
    expect(source).toContain("requestedAuthorityMode === 'teaching' || requestedAuthorityMode === 'supervision'");
    expect(source).toContain('useLessonPlanDetail(lessonPlanId, { authorityMode })');
  });

  it('uses the shared lifecycle resolver for primary actions', () => {
    expect(source).toContain('resolveLessonPlanLifecycleActions');
    expect(source).toContain("label: 'Review lesson plan'");
    expect(source).toContain("label: 'Schedule this lesson'");
    expect(source).toContain("label: 'Open scheduled lesson'");
    expect(source).toContain("const canEditLessonPlan = Boolean(lifecycleActions?.canEdit)");
    expect(source).not.toContain('Review / edit lesson plan');
  });

  it('treats review as explicit acceptance rather than mandatory rewriting', () => {
    expect(source).toContain('Scholaroscope-generated lesson plans are system drafts');
    expect(source).toContain('Structured lesson draft');
    expect(source).toContain('Edits are optional');
    expect(source).toContain('Complete review');
    expect(source).toContain('await markReviewed()');
    expect(source).not.toContain('REVIEW_SECTION_FIELDS');
    expect(source).not.toContain('reviewForm');
  });

  it('uses generation source labels without exposing raw fallback errors to ordinary banners', () => {
    expect(source).toContain('getLessonGenerationBadge');
    expect(source).toContain('AI-assisted draft generated and validated');
    expect(source).toContain('Basic draft.');
    expect(source).not.toContain('Generation metadata');
    expect(source).not.toContain('Fallback reason: {fallbackReason}');
  });

  it('keeps lesson content prominent and exception requests out of normal lifecycle states', () => {
    expect(source).toContain('Lesson plan content');
    expect(source).toContain('Planning sources');
    expect(source).toContain('Optional follow-up');
    expect(source).not.toContain('Request schedule exception');
    expect(source).not.toContain('Request edit');
  });
});
