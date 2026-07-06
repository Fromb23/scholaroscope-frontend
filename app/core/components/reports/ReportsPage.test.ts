import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('ReportsPage surface router', () => {
  it('renders the report surface router inline without navigation redirects', () => {
    const source = read('app/core/components/reports/ReportsPage.tsx');

    expect(source).toContain('ReportSurfaceRouter');
    expect(source).toContain('resolveReportSurface');
    expect(source).not.toContain('router.replace');
    expect(source).not.toContain('router.push');
  });
});
