import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildComputePolicyRequiredSetupHref,
  resolveCbcComputeFailure,
} from './CohortReportSetupRoutes';

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

  it('builds class policy setup links for class compute setup-required errors', () => {
    expect(buildComputePolicyRequiredSetupHref('class', 9)).toBe(
      '/academic/cohorts/9/report-setup?source=class_configuration&cohort=9&returnTo=%2Facademic%2Fcohorts%2F9',
    );
  });

  it('builds subject policy setup links with subject anchor returns', () => {
    expect(buildComputePolicyRequiredSetupHref('subject', 9, 26)).toBe(
      '/academic/cohorts/9/subjects/26/report-policy?source=class_configuration&cohort=9&cohort_subject=26&returnTo=%2Facademic%2Fcohorts%2F9%23subject-26',
    );
  });

  it('maps structured policy-required compute errors to setup guidance', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'class_report_policy_required',
            message: 'Create report rules before calculating this report.',
          },
        },
      },
    };

    expect(resolveCbcComputeFailure(error, 'subject', 9, 26)).toEqual({
      message: 'Create report rules before calculating this subject report.',
      actionLabel: 'Set report rules',
      actionHref: '/academic/cohorts/9/subjects/26/report-policy?source=class_configuration&cohort=9&cohort_subject=26&returnTo=%2Facademic%2Fcohorts%2F9%23subject-26',
    });
  });

  it('keeps generic compute errors generic', () => {
    expect(resolveCbcComputeFailure({
      response: { data: { message: 'Unexpected compute failure.' } },
    }, 'class', 9)).toEqual({
      message: 'Unexpected compute failure.',
    });
  });
});
