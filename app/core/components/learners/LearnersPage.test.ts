import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/learners/LearnersPage.tsx'),
  'utf8',
);

describe('LearnersPage exports', () => {
  it('uses the shared report export hook', () => {
    expect(source).toContain('useReportExport');
    expect(source).not.toContain('exportError');
    expect(source).not.toContain('setExportError');
  });
});
