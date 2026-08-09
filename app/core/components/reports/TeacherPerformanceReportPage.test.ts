import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/reports/TeacherPerformanceReportPage.tsx'),
  'utf8',
);

describe('teacher report operating-context language', () => {
  it('uses operating context and current report subject for first-person framing', () => {
    expect(source).toContain("activeOperatingContext === 'MY_TEACHING'");
    expect(source).toContain('report.instructor.id === user?.id');
    expect(source).toContain('My Teaching Report');
    expect(source).toContain('My Teaching Performance');
    expect(source).toContain('My Assigned Subjects');
  });

  it('omits self identity only in My Teaching and retains it for management', () => {
    expect(source).toMatch(/\{!isMyTeachingSelfReport \? \(\s*<div>/);
    expect(source).toContain('report?.instructor.name');
    expect(source).toContain('report?.instructor.email');
    expect(source).toContain('report?.organization.name');
  });
});
