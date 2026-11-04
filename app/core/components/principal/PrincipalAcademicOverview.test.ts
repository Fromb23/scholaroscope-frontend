import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Principal academic overview architecture', () => {
  const source = readFileSync(
    join(process.cwd(), 'app/core/components/principal/PrincipalAcademicOverview.tsx'),
    'utf8',
  );

  it('auto-selects one curriculum without rendering a redundant selector', () => {
    expect(source).toContain('payload.options.curricula.length === 1');
    expect(source).toContain('data.options.curricula.length > 1');
  });

  it('uses canonical hierarchy state, supervision reports, and exact return destinations', () => {
    expect(source).toContain('applyReportStateChange');
    expect(source).toContain("authorityMode: 'supervision'");
    expect(source).toContain('buildReportOrigin(pathname, searchParams)');
    expect(source).toContain("projection: 'projects'");
  });
});
