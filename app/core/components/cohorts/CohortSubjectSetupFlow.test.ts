import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('cohort class-subject setup empty state', () => {
  it('explains missing compatible offerings and links authorized users to catalogue with safe return', () => {
    const modalSource = source('app/core/components/cohorts/CohortComponents.tsx');
    const detailSource = source('app/core/components/academic/cohorts/CohortDetailPage.tsx');
    const catalogueSource = source('app/core/components/academic/subjects/SubjectCataloguePage.tsx');

    expect(modalSource).toContain('No compatible subjects have been configured for');
    expect(modalSource).toContain('Select subjects from catalogue');
    expect(modalSource).toContain('academic.subjects.manage');
    expect(modalSource).toContain('returnTo: returnTo ?? `/academic/cohorts/${cohortId}?open=subjects`');
    expect(modalSource).toContain('level: normalizeAcademicLevel(cohortLevel)');
    expect(detailSource).toContain("cohortSubjectSetupReturnParams.set('open', 'subjects')");
    expect(detailSource).toContain("searchParams.get('open') !== 'subjects'");
    expect(detailSource).toContain('void refetchCohortSubjects()');
    expect(catalogueSource).toContain('sanitizeAppDestination');
  });
});
