import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('SchemeComplianceOverview', () => {
  it('uses the scheme compliance endpoint and progress drill-down route', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/plugins/schemes/components/SchemeComplianceOverview.tsx'),
      'utf8',
    );

    expect(source).toContain('useSchemeCompliance');
    expect(source).toContain('Needs Review');
    expect(source).toContain('/admin/instructors/${row.instructor_id}/progress#schemes');
    expect(source).toContain('Search teacher');
    expect(source).toContain('Subjects / classes');
  });
});
