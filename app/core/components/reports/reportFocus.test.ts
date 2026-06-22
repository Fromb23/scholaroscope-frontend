import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('report search focus behavior', () => {
  it('adds a stable learner report panel target and focuses it after selection', () => {
    const source = readFileSync(join(process.cwd(), 'app/core/components/reports/StudentsReportPage.tsx'), 'utf8');

    expect(source).toContain('learner-report-panel');
    expect(source).toContain('focusReportPanel');
    expect(source).toContain('scrollIntoView');
    expect(source).toContain('focus({ preventScroll: true })');
    expect(source).toContain('selectedStudentId === student.id');
  });

  it('adds a stable attendance report panel target and focuses it after learner match selection', () => {
    const source = readFileSync(join(process.cwd(), 'app/core/components/reports/AttendanceReportPage.tsx'), 'utf8');

    expect(source).toContain('attendance-report-panel');
    expect(source).toContain('focusReportPanel');
    expect(source).toContain('scrollIntoView');
    expect(source).toContain('focus({ preventScroll: true })');
    expect(source).toContain('selectedStudentId === student.id');
  });
});
