import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/admin/instructors/InstructorManagementPage.tsx'),
  'utf8',
);

describe('InstructorManagementPage desire paths', () => {
  it('keeps progress navigation and adds report navigation with return state', () => {
    expect(source).toContain('buildProgressHref');
    expect(source).toContain('canRenderInstitutionReportOverview');
    expect(source).toContain('buildInstructorReportHref(id, { returnTo: currentReturnTo })');
    expect(source).toContain('Progress');
    expect(source).toContain('Report');
  });
});
