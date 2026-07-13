import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('lesson plan and scheme cohort-subject filter policy', () => {
  it('does not send subject filters when cohort_subject is present', () => {
    const lessonPlans = readFileSync(
      join(process.cwd(), 'app/core/components/lessonPlans/LessonPlansPage.tsx'),
      'utf8',
    );
    const schemes = readFileSync(
      join(process.cwd(), 'app/plugins/schemes/components/SchemesPage.tsx'),
      'utf8',
    );

    expect(lessonPlans).toContain('subject: cohortSubjectFilter ? undefined : toOptionalNumber(subjectFilter)');
    expect(lessonPlans).toContain('if (!resolved.cohort_subject && resolved.subject) params.set');
    expect(schemes).toContain('subject: cohortSubjectFilter ? undefined : toOptionalNumber(subjectFilter)');
    expect(schemes).toContain("if (!cohortSubjectFilter && subjectFilter) params.set('subject', subjectFilter)");
  });

  it('disables raw card-list fetches while institution compliance overviews are active', () => {
    const lessonPlans = readFileSync(
      join(process.cwd(), 'app/core/components/lessonPlans/LessonPlansPage.tsx'),
      'utf8',
    );
    const schemes = readFileSync(
      join(process.cwd(), 'app/plugins/schemes/components/SchemesPage.tsx'),
      'utf8',
    );

    expect(lessonPlans).toContain('LessonPlanComplianceOverview');
    expect(lessonPlans).toContain('enabled: !institutionComplianceMode');
    expect(schemes).toContain('SchemeComplianceOverview');
    expect(schemes).toContain('enabled: !institutionComplianceMode');
  });
});
