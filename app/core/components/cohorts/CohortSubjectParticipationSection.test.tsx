import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  buildCohortSubjectActionMenuItems,
  CohortSubjectParticipationSection,
  type CohortSubjectAction,
} from './CohortSubjectParticipationSection';
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

const subjectActions: CohortSubjectAction[] = [
  { label: 'Schemes', href: '/schemes?cohort_subject=26' },
  { label: 'Lesson plans', href: '/lesson-plans?cohort_subject=26' },
  { label: 'Sessions', href: '/sessions?cohort_subject=26' },
  { label: 'Configure policy', href: '/academic/cohorts/9/subjects/26/report-policy' },
  { label: 'Compute subject results', href: '/academic/cohorts/9/subjects/26/report-computation' },
];

function renderSubjectSection() {
  return renderToStaticMarkup(
    <CohortSubjectParticipationSection
      cohortSubjects={[cohortSubject]}
      summaries={{
        26: {
          counts: {
            enrolled: 18,
            available: 2,
            cohort_total: 20,
          },
          instructorName: null,
          instructorState: 'unassigned',
        },
      }}
      loading={false}
      showInstructorColumn={false}
      buildSubjectLearnersHref={() => '/academic/cohort-subjects/26/learners'}
      buildSubjectActions={() => subjectActions}
    />,
  );
}

describe('cohort subject participation section actions', () => {
  it('builds mobile menu items from the same subject action list', () => {
    const items = buildCohortSubjectActionMenuItems({
      subjectLearnersHref: '/academic/cohort-subjects/26/learners',
      subjectActions,
    });

    expect(items.map((item) => item.label)).toEqual([
      'Manage Subject Learners',
      'Schemes',
      'Lesson plans',
      'Sessions',
      'Configure policy',
      'Compute subject results',
    ]);
    expect(items.find((item) => item.label === 'Schemes')?.href).toBe('/schemes?cohort_subject=26');
  });

  it('renders a compact mobile More surface while preserving desktop actions', () => {
    const html = renderSubjectSection();

    expect(html).toContain('Open Mathematics actions');
    expect(html).toContain('More');
    expect(html).toContain('sm:hidden');
    expect(html).toContain('hidden flex-wrap gap-2 sm:flex');
    expect(html).toContain('Manage Subject Learners');
    expect(html).toContain('Configure policy');
    expect(html).toContain('/academic/cohorts/9/subjects/26/report-computation');
  });
});
