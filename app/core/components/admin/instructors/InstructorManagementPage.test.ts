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

  it('keeps create-instructor success in the foreground sheet instead of a page banner', () => {
    expect(source).toContain('const [createSuccess, setCreateSuccess]');
    expect(source).toContain('title="Instructor created"');
    expect(source).toContain('message={createSuccess}');
    expect(source).toContain('footer={');
    expect(source).toContain('closeDisabled={submitting}');
    expect(source).toContain('closeOnBackdrop={false}');
    expect(source).not.toContain('actionSuccess');
    expect(source).not.toContain('setActionSuccess');
    expect(source).not.toContain("flash('Instructor created successfully')");
  });
});
