import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('InstructorReportsOverviewPage exports', () => {
  it('does not define browser-generated export handling', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/reports/InstructorReportsOverviewPage.tsx'),
      'utf8',
    );

    expect(source).not.toContain('ExportModal');
    expect(source).not.toContain('const handleExport');
    expect(source).not.toContain('downloadBlob');
    expect(source).not.toContain('exportError');
  });
});
