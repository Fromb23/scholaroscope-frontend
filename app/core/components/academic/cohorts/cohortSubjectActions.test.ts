import { describe, expect, it } from 'vitest';

import {
  buildCohortSubjectTeachingActions,
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

    for (const label of ['Schemes', 'Lesson plans', 'Sessions', 'Assignments', 'Assessments']) {
      const href = actions.find((action) => action.label === label)?.href ?? '';
      const query = new URLSearchParams(href.split('?')[1] ?? '');
      expect(query.get('cohort_subject')).toBe('26');
      expect(query.has('subject')).toBe(false);
      expect(query.get('returnTo')).toBe('/academic/cohorts/9#subject-26');
    }

    expect(actions.find((action) => action.label === 'Subject reports')?.href).toBe(
      '/reports/instructor/cohort-subjects/26?returnTo=%2Facademic%2Fcohorts%2F9%23subject-26&source=cohort_subject',
    );
    expect(actions.find((action) => action.label === 'CBC Browser')?.href).toContain('cohort_subject_id=26');
    expect(actions.find((action) => action.label === 'CBC Progress')?.href).toContain('cohort_subject_id=26');
  });

  it('shows teaching workflow actions only for teaching actors', () => {
    expect(shouldShowCohortSubjectTeachingActions({ isTeachingActor: false })).toBe(false);
    expect(shouldShowCohortSubjectTeachingActions({ isTeachingActor: true })).toBe(true);
  });
});
