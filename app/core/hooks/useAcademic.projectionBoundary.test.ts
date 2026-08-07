import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('cohort management projection boundary', () => {
  it('does not narrow managed cohort lists just because the actor can teach', () => {
    const hookSource = source('app/core/hooks/useAcademic.ts');
    const accessSource = source('app/core/hooks/useInstructorCohortAccess.ts');

    expect(accessSource).toContain('hasManagementProjection');
    expect(hookSource).toContain('shouldApplyTeachingProjection');
    expect(hookSource).toContain('&& !instructorAccess.hasManagementProjection');
    expect(hookSource).toContain('shouldApplyTeachingProjection');
  });
});
