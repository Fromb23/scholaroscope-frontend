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
});
