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
  { label: 'Prepare scheme', href: '/schemes?cohort_subject=26' },
  { label: 'Prepare lesson', href: '/lesson-plans?cohort_subject=26' },
  { label: 'Record lesson', href: '/sessions?cohort_subject=26' },
  { label: 'Assignments', href: '/academic/cohorts/9/assignments?cohort_subject=26' },
  { label: 'Assessments', href: '/assessments?cohort_subject=26' },
  { label: 'Set report rules', href: '/academic/cohorts/9/subjects/26/report-policy' },
  { label: 'Calculate subject report', href: '/academic/cohorts/9/subjects/26/report-computation' },
  { label: 'Open subject report', href: '/reports/instructor/cohort-subjects/26' },
  { label: 'View CBC content', href: '/cbc/browser?cohort_subject_id=26' },
  { label: 'Check CBC progress', href: '/cbc/progress?cohort_subject_id=26' },
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
  it('builds mobile action items from the same subject action list', () => {
    const items = buildCohortSubjectActionMenuItems({
      subjectLearnersHref: '/academic/cohort-subjects/26/learners',
      subjectActions,
    });

    expect(items.map((item) => item.label)).toEqual([
      'Manage learners',
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
    expect(items.find((item) => item.label === 'Prepare scheme')?.href).toBe('/schemes?cohort_subject=26');
    expect(items.find((item) => item.label === 'Manage learners')?.mobileGroup).toBe('daily');
    expect(items.find((item) => item.label === 'Calculate subject report')?.mobileGroup).toBe('setup');
    expect(items.find((item) => item.label === 'Calculate subject report')?.mobileLabel).toBe('Calculate report');
  });

  it('renders mobile action cards while preserving desktop actions at md and up', () => {
    const html = renderSubjectSection();

    expect(html).toContain('md:hidden');
    expect(html).toContain('Class setup');
    expect(html).toContain('hidden flex-wrap gap-2 md:flex');
    expect(html).toContain('Manage learners');
    expect(html).toContain('Learners');
    expect(html).toContain('Check CBC progress');
    expect(html).toContain('CBC progress');
    expect(html).toContain('Set report rules');
    expect(html).toContain('Calculate report');
    expect(html).toContain('/academic/cohorts/9/subjects/26/report-computation');
    expect(html).not.toContain('More');
  });
});
