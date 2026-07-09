import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AttendanceReportPage exports', () => {
  it('uses the shared report export hook', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/reports/AttendanceReportPage.tsx'),
      'utf8',
    );

    expect(source).toContain('useReportExport');
    expect(source).not.toContain('downloadBlob');
    expect(source).not.toContain('exportError');
    expect(source).not.toContain('window.alert');
  });

  it('allows scoped instructor attendance reports through the page gate', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/reports/AttendanceReportPage.tsx'),
      'utf8',
    );

    expect(source).toContain('isScopedInstructorAttendanceReport');
    expect(source).toContain('allowInstructorScopedAccess={scopedInstructorAccess}');
    expect(source).toContain('Learner attendance report');
  });
});
