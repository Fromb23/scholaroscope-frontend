import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TeachingTodayAfterTeachingPanel } from './TeachingTodayAfterTeachingPanel';
import type { TeachingTodayContext } from '@/app/core/hooks/useTeachingToday';

function afterTeaching(
  overrides: Partial<TeachingTodayContext['afterTeaching']> = {},
): TeachingTodayContext['afterTeaching'] {
  return {
    pendingAssessmentReviewCount: 0,
    pendingAssessments: [],
    assignmentWork: [],
    ...overrides,
  };
}

describe('TeachingTodayAfterTeachingPanel', () => {
  it('shows no assessment reminder when there are no actionable assessments', () => {
    const html = renderToStaticMarkup(
      <TeachingTodayAfterTeachingPanel
        afterTeaching={afterTeaching({
          pendingAssessmentReviewCount: 3,
          pendingAssessments: [],
        })}
      />,
    );

    expect(html).toContain('No assignment or assessment queue right now.');
    expect(html).not.toContain('Open assessments');
    expect(html).not.toContain('assessment records need review');
  });

  it('counts one assessment with three learner rows as one assessment work item', () => {
    const html = renderToStaticMarkup(
      <TeachingTodayAfterTeachingPanel
        afterTeaching={afterTeaching({
          pendingAssessmentReviewCount: 3,
          pendingAssessments: [
            {
              assessment_id: 91,
              assessment_name: 'Computer Studies CAT',
              cohort_subject_id: 26,
              cohort_name: 'Grade 7',
              subject_name: 'Computer Studies',
              assessment_date: '2026-06-30',
              status: 'ACTIVE',
              pending_learner_count: 3,
            } as unknown as TeachingTodayContext['afterTeaching']['pendingAssessments'][number],
          ],
        })}
      />,
    );

    expect(html).toContain('Computer Studies CAT');
    expect(html).toContain('3 learner records pending');
    expect(html).toContain('Showing 1 of 1 assessment.');
    expect(html).toContain('3 learner records require review.');
    expect(html).not.toContain('Showing 1 of 3 pending records');
  });

  it('keeps assignment reminders visible when assessment work is empty', () => {
    const html = renderToStaticMarkup(
      <TeachingTodayAfterTeachingPanel
        afterTeaching={afterTeaching({
          assignmentWork: [
            {
              assignment_id: 44,
              title: 'Soil care task',
              next_action: 'REVIEW_WORK',
              next_action_label: 'Review learner work',
              next_action_href: '/assignments/44?stage=review',
              reminder_type: 'ASSIGNMENT_REVIEW_PENDING',
              lifecycle_stage: 'PUBLISHED',
              urgency: 'normal',
              evidence_blocked: false,
              blocking_items: [],
              counts: {
                total_recipients: 3,
                submitted: 3,
                missing: 0,
                pending_reviews: 2,
                reviewed: 1,
                stored_records: 0,
              },
              cohort: { id: 7, name: 'Grade 7' },
              subject: { id: 12, name: 'Agriculture' },
              lesson_plan: null,
            } as unknown as TeachingTodayContext['afterTeaching']['assignmentWork'][number],
          ],
        })}
      />,
    );

    expect(html).toContain('Soil care task');
    expect(html).toContain('Review learner work');
    expect(html).not.toContain('Open assessments');
  });
});
