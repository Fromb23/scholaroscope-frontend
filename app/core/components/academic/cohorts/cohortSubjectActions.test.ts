import { describe, expect, it } from 'vitest';

import {
  buildCohortSubjectTeachingActions,
  splitCohortSubjectMobileActions,
  shouldShowCohortSubjectTeachingActions,
} from './cohortSubjectActions';
import type { CohortSubject } from '@/app/core/types/academic';

const cohortSubject = {
  id: 26,
  cohort: 9,
  cohort_id: 9,
  cohort_name: 'Grade 7',
  cohort_level: 'Grade 7',
  subject: 4,
  subject_id: 4,
  subject_name: 'Mathematics',
  subject_code: 'MAT',
  curriculum_name: 'CBC',
  curriculum_type: 'CBE',
  is_compulsory: true,
  cbc_cohort_subject_id: 41,
  subject_profile_id: 5,
} satisfies CohortSubject;

describe('cohort subject teaching actions', () => {
  it('uses cohort_subject as the canonical teaching context without leaking subject=cohortSubjectId', () => {
    const actions = buildCohortSubjectTeachingActions({
      cohortId: 9,
      cohortReturnTo: '/academic/cohorts/9',
      subject: cohortSubject,
      isCBC: true,
      hasCBCPlugin: true,
    });

    for (const label of ['Prepare scheme', 'Prepare lesson', 'Record lesson', 'Assignments', 'Assessments']) {
      const href = actions.find((action) => action.label === label)?.href ?? '';
      const query = new URLSearchParams(href.split('?')[1] ?? '');
      expect(query.get('cohort_subject')).toBe('26');
      expect(query.has('subject')).toBe(false);
      expect(query.get('returnTo')).toBe('/academic/cohorts/9#subject-26');
    }

    expect(actions.find((action) => action.label === 'Open subject report')?.href).toBe(
      '/reports/instructor/cohort-subjects/26?returnTo=%2Facademic%2Fcohorts%2F9%23subject-26&source=cohort_subject',
    );
    expect(actions.find((action) => action.label === 'View CBC content')?.href).toContain('cohort_subject_id=26');
    expect(actions.find((action) => action.label === 'Check CBC progress')?.href).toContain('cohort_subject_id=26');
  });

  it('adds class-owned report setup actions for self-managed CBC class subjects', () => {
    const actions = buildCohortSubjectTeachingActions({
      cohortId: 9,
      cohortReturnTo: '/academic/cohorts/9',
      subject: cohortSubject,
      isCBC: true,
      hasCBCPlugin: true,
      isClassConfigurationWorkspace: true,
    });

    expect(actions.find((action) => action.label === 'Set report rules')?.href).toBe(
      '/academic/cohorts/9/subjects/26/report-policy?source=class_configuration&cohort=9&cohort_subject=26&cbc_cohort_subject=41&returnTo=%2Facademic%2Fcohorts%2F9%23subject-26',
    );
    expect(actions.find((action) => action.label === 'Calculate subject report')?.href).toBe(
      '/academic/cohorts/9/subjects/26/report-computation?source=class_configuration&cohort=9&cohort_subject=26&returnTo=%2Facademic%2Fcohorts%2F9%23subject-26',
    );
    expect(actions.map((action) => action.label).indexOf('Set report rules')).toBeLessThan(
      actions.map((action) => action.label).indexOf('Open subject report'),
    );
    expect(actions.map((action) => action.label)).toEqual([
      'Prepare scheme',
      'Prepare lesson',
      'Record lesson',
      'Assignments',
      'Assessments',
      'Set report rules',
      'Calculate subject report',
      'Open subject report',
      'View CBC content',
      'Check CBC progress',
    ]);
  });

  it('tags mobile class actions by daily teaching versus setup work from one source', () => {
    const actions = buildCohortSubjectTeachingActions({
      cohortId: 9,
      cohortReturnTo: '/academic/cohorts/9',
      subject: cohortSubject,
      isCBC: true,
      hasCBCPlugin: true,
      isClassConfigurationWorkspace: true,
    });
    const { daily, setup } = splitCohortSubjectMobileActions(actions);

    expect(daily.map((action) => action.label)).toEqual([
      'Prepare lesson',
      'Record lesson',
      'Assignments',
      'Assessments',
      'Open subject report',
      'Check CBC progress',
    ]);
    expect(setup.map((action) => action.label)).toEqual([
      'Prepare scheme',
      'Set report rules',
      'Calculate subject report',
      'View CBC content',
    ]);
    expect(actions.find((action) => action.label === 'Calculate subject report')?.mobileLabel).toBe('Calculate report');
  });

  it('does not expose freelance class-configuration actions for institution subject cards', () => {
    const actions = buildCohortSubjectTeachingActions({
      cohortId: 9,
      cohortReturnTo: '/academic/cohorts/9',
      subject: cohortSubject,
      isCBC: true,
      hasCBCPlugin: true,
      isClassConfigurationWorkspace: false,
    });

    expect(actions.some((action) => action.label === 'Set report rules')).toBe(false);
    expect(actions.some((action) => action.label === 'Calculate subject report')).toBe(false);
  });

  it('shows teaching workflow actions only for teaching actors', () => {
    expect(shouldShowCohortSubjectTeachingActions({ isTeachingActor: false })).toBe(false);
    expect(shouldShowCohortSubjectTeachingActions({ isTeachingActor: true })).toBe(true);
  });
});
