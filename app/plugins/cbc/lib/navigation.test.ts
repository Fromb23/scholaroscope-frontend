import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildCbcPath, updateCbcUrlFilter } from './navigation';

describe('CBC URL-owned return state', () => {
  const reportOrigin =
    '/reports/instructor/cohort-subjects/3?projection=curriculum-progress&term=1&q=support&page=2';

  it('builds a copyable scoped CBC URL with exact report returnTo', () => {
    const href = buildCbcPath('/cbc/progress/cohort/8', {
      cohort: 8,
      subject: 13,
      cohortSubjectId: 3,
      authorityMode: 'teaching',
      returnTo: reportOrigin,
    });
    const url = new URL(href, 'https://scholaroscope.local');

    expect(url.searchParams.get('cohort')).toBe('8');
    expect(url.searchParams.get('subject')).toBe('13');
    expect(url.searchParams.get('cohort_subject_id')).toBe('3');
    expect(url.searchParams.get('returnTo')).toBe(reportOrigin);
  });

  it('preserves returnTo when first-render filter normalization replaces a filter', () => {
    const initial = new URLSearchParams({
      subject: '13',
      cohort_subject_id: '3',
      term: '1',
      returnTo: reportOrigin,
    });
    const normalized = updateCbcUrlFilter(initial, 'subject', 14);

    expect(normalized.get('subject')).toBe('14');
    expect(normalized.get('cohort_subject_id')).toBe('3');
    expect(normalized.get('term')).toBe('1');
    expect(normalized.get('returnTo')).toBe(reportOrigin);
  });

  it('reads reload-safe returnTo from the current URL rather than navigation history', () => {
    const hook = readFileSync(
      join(process.cwd(), 'app/plugins/cbc/hooks/useCBCCohortProgressPage.ts'),
      'utf8',
    );
    const page = readFileSync(
      join(process.cwd(), 'app/plugins/cbc/components/progress/CBCCohortProgressPage.tsx'),
      'utf8',
    );

    expect(hook).toContain("sanitizeInternalReturnTo(searchParams.get('returnTo'))");
    expect(hook).toContain('updateCbcUrlFilter(searchParams');
    expect(hook).toMatch(
      /if \(hasScopedContext\)[\s\S]*?return querySubjectId;[\s\S]*?typeof window === 'undefined'/,
    );
    expect(hook).not.toContain('router.back()');
    expect(page).toContain("page.returnTo ?? '/cbc/progress'");
  });
});
