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
});
