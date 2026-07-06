import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  FreelanceReportLandingContent,
  getFreelanceReportLandingCards,
} from './FreelanceReportLandingPage';
import type { InstructorOverview } from '@/app/core/types/reporting';

const overview = {
  instructor: {
    role: 'ADMIN',
  },
  total_assigned_cohort_subjects: 2,
  total_visible_learners: 12,
  assigned_cohort_subjects: [
    {
      id: 1,
      cohort_id: 10,
      cohort_name: 'Grade 8',
      subject_id: 20,
      subject_name: 'Mathematics',
      subject_code: 'MATH',
      curriculum: 'CBC',
      curriculum_type: 'CBE',
      academic_year: '2026',
      active_learner_count: 12,
      average_grade: null,
      average_attendance: 91,
      session_count: 8,
      completed_session_count: 7,
      reporting_source: 'cbc',
      performance_source: 'cbc',
      status: 'ON_TRACK',
      note: null,
      assessment_completion: {
        total_assessments: 4,
        finalized_assessments: 3,
        draft_assessments: 1,
        active_assessments: 0,
        missing_scores_count: 0,
      },
    },
  ],
} satisfies InstructorOverview;

describe('FreelanceReportLandingPage', () => {
  it('renders without crashing for a personal freelance workspace surface', () => {
    const html = renderToStaticMarkup(
      createElement(FreelanceReportLandingContent, { overview }),
    );

    expect(html).toContain('Your reporting workspace');
    expect(html).toContain('Learners');
    expect(html).toContain('Assessments');
    expect(html).toContain('Average Attendance');
  });

  it('does not render institution supervision elements', () => {
    const html = renderToStaticMarkup(
      createElement(FreelanceReportLandingContent, { overview }),
    );

    expect(html).not.toContain('Admin supervision');
    expect(html).not.toContain('My Teaching');
    expect(html).not.toContain('/reports/instructors');
    expect(html).not.toContain('Instructor Reports');
  });

  it('renders the four primary freelance report nav cards', () => {
    expect(getFreelanceReportLandingCards().map((card) => card.name)).toEqual([
      'My learners',
      'My assessments',
      'My attendance',
      'My class subjects',
    ]);
  });
});
