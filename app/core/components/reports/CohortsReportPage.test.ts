import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CohortsReportPage exports', () => {
  it('uses the shared report export hook', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/reports/CohortsReportPage.tsx'),
      'utf8',
    );

    expect(source).toContain('useReportExport');
    expect(source).not.toContain('downloadBlob');
    expect(source).not.toContain('exportError');
    expect(source).not.toContain('window.alert');
  });

  it('keeps historical term selection available when no active term exists', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/reports/CohortsReportPage.tsx'),
      'utf8',
    );

    expect(source).toContain('const { terms, loading: termsLoading } = useTerms();');
    expect(source).toContain("{ value: '', label: currentTermLoading ? 'Loading active term...' : 'Choose term' }");
    expect(source).toContain('...terms.map((term) => ({');
    expect(source).toContain('Choose a term above before opening a class report.');
    expect(source).not.toContain('router.replace(buildAcademicSetupRedirectHref');
  });
});
