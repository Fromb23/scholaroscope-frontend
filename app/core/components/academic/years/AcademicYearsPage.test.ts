import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(process.cwd(), 'app/core/components/academic/years/AcademicYearsPage.tsx'),
  'utf8',
);
const hookSource = readFileSync(
  join(process.cwd(), 'app/core/hooks/useAcademic.ts'),
  'utf8',
);

describe('AcademicYearsPage curriculum entitlement contract', () => {
  it('loads only the backend active/selectable curriculum catalogue for academic-year choices', () => {
    expect(pageSource).toContain("useCurricula({ activeOnly: true })");
    expect(hookSource).toContain('activeOnly');
    expect(hookSource).toContain('curriculumAPI.getActive(params)');
  });

  it('does not strip structured academic-year mutation errors before field mapping', () => {
    expect(hookSource).toContain("throw wrapApiMutationError(err, 'Failed to create academic year')");
    expect(hookSource).toContain("throw wrapApiMutationError(err, 'Failed to update academic year')");
    expect(pageSource).toContain('extractFieldErrors');
    expect(pageSource).toContain('error={fieldErrors.curriculum?.[0]}');
  });

  it('prevents submission while curriculum setup state is still loading', () => {
    expect(pageSource).toContain('disabled={Boolean(editingYear) || curriculaLoading}');
    expect(pageSource).toContain('disabled={saving || curriculaLoading}');
    expect(pageSource).toContain("label: curriculaLoading ? 'Loading curricula...' : 'Select curriculum'");
  });
});
