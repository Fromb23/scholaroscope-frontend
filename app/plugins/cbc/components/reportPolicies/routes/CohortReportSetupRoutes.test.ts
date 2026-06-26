import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/plugins/cbc/components/reportPolicies/routes/CohortReportSetupRoutes.tsx'),
  'utf8',
);

describe('cohort report setup routes', () => {
  it('keeps report policy and computation under class-owned route context', () => {
    expect(source).toContain("authoringMode={scope === 'subject' ? 'CLASS_SUBJECT_SETUP' : 'CLASS_SETUP'}");
    expect(source).toContain("source: 'class_configuration'");
    expect(source).toContain('cohort: cohortId');
    expect(source).toContain("cohort_subject: scope === 'subject' ? cohortSubjectId ?? undefined : undefined");
  });

  it('preserves workspace return navigation copy', () => {
    expect(source).toContain('backLabel="Back to workspace"');
    expect(source).toContain('Back to workspace');
    expect(source).toContain('useWorkspaceReturnTo');
    expect(source).toContain('isSafeNextPath');
  });
});
