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

  it('uses one stable-ID accordion with all panels closed initially', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/reports/InstructorReportsOverviewPage.tsx'),
      'utf8',
    );

    expect(source).toContain('useState<number | null>(null)');
    expect(source).toContain('openCohortSubjectId === item.id');
    expect(source).toContain('setOpenCohortSubjectId(open ? null : item.id)');
    expect(source).toContain('aria-expanded={open}');
    expect(source).toContain('assigned-cohort-subject-panel-${item.id}');
    expect(source).toMatch(/<div\s+key=\{item\.id\}/);
  });

  it('closes an open panel when refreshed filters remove it', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/reports/InstructorReportsOverviewPage.tsx'),
      'utf8',
    );
    expect(source).toContain('!overview?.assigned_cohort_subjects.some');
    expect(source).toContain('setOpenCohortSubjectId(null)');
    expect(source).toContain('assignmentFilterSignature');
  });
});
