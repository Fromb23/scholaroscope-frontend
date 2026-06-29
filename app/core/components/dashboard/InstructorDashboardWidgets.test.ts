import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  AssessmentsSummaryCard,
  LearnersAtRisk,
} from './InstructorDashboardWidgets';
import { buildTeachingActionQueue } from '@/app/core/lib/teachingActionQueue';
import {
  AssessmentParticipationMode,
  AssessmentStatus,
  AssessmentType,
  EvaluationType,
  AssessmentScoreStatus,
  type Assessment,
  type AssessmentScore,
} from '@/app/core/types/assessment';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/dashboard/InstructorDashboardWidgets.tsx'),
  'utf8',
);

function renderLearnersAtRisk(overrides: Partial<Parameters<typeof LearnersAtRisk>[0]> = {}) {
  return renderToStaticMarkup(createElement(LearnersAtRisk, {
    needsSupport: 0,
    attendanceRiskCount: 0,
    attendanceRiskLearnerCount: 0,
    attendanceRiskLoading: false,
    attendanceRiskError: null,
    ...overrides,
  }));
}

function buildAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 91,
    term: 1,
    term_name: 'Term 1',
    cohort_subject: 12,
    cohort_id: 7,
    cohort_name: 'Grade 7',
    subject_id: 4,
    subject_name: 'Integrated Science',
    subject_code: 'SCI',
    curriculum_id: 3,
    curriculum_name: 'CBC',
    curriculum_type: 'CBC',
    cohort_curriculum_type: 'CBC',
    subject_curriculum_type: 'CBC',
    subject_source: 'kernel',
    teaching_link_id: null,
    cbc_cohort_subject_id: null,
    subject_profile_id: null,
    name: 'Matter quiz',
    assessment_type: AssessmentType.CAT,
    assessment_type_display: 'CAT',
    evaluation_type: EvaluationType.NUMERIC,
    evaluation_type_display: 'Numeric',
    total_marks: 20,
    rubric_scale: null,
    rubric_scale_name: null,
    assessment_date: '2026-06-30',
    description: '',
    participation_mode: AssessmentParticipationMode.NONE,
    status: AssessmentStatus.DRAFT,
    status_display: 'Draft',
    scores_count: 0,
    can_update: true,
    can_delete: true,
    can_activate: true,
    can_finalize: false,
    can_score: true,
    created_at: '2026-06-29T08:00:00Z',
    created_by: 5,
    ...overrides,
  };
}

function buildPendingScore(overrides: Partial<AssessmentScore> = {}): AssessmentScore {
  return {
    id: 101,
    assessment: 91,
    assessment_name: 'Matter quiz',
    subject_name: 'Integrated Science',
    student: 301,
    student_name: 'Amina Otieno',
    student_admission: 'ADM-301',
    score: null,
    total_marks: 20,
    percentage: null,
    rubric_level: null,
    rubric_level_label: null,
    rubric_level_code: null,
    status: AssessmentScoreStatus.PENDING_REVIEW,
    status_display: 'Pending review',
    is_pending_review: true,
    comments: '',
    submitted_at: null,
    graded_at: '2026-06-29T08:00:00Z',
    graded_by: 'teacher@example.test',
    ...overrides,
  };
}

function renderAssessmentsSummaryCard(overrides: Partial<Parameters<typeof AssessmentsSummaryCard>[0]> = {}) {
  return renderToStaticMarkup(createElement(AssessmentsSummaryCard, {
    needsGrading: 0,
    upcomingAssessments: 0,
    pendingReviewRows: [],
    queue: buildTeachingActionQueue({
      teachingLoadCount: 1,
      now: new Date('2026-06-29T10:00:00Z'),
    }),
    ...overrides,
  }));
}

describe('Instructor dashboard widget teaching memory behavior', () => {
  it('makes TodayScheduleCard contextual rather than a competing action engine', () => {
    const widgetSource = source();

    expect(widgetSource).toContain('getTodayScheduleStatusLabel');
    expect(widgetSource).toContain('Action shown above');
    expect(widgetSource).toContain('queueAction?.stageLabel');
    expect(widgetSource).not.toContain('getTodayScheduleActionLabel');
  });

  it('marks assessment review rows when the primary assessment action is shown above', () => {
    const widgetSource = source();

    expect(widgetSource).toContain('primaryAssessmentObjectKey');
    expect(widgetSource).toContain('getAssessmentTeachingObjectKey');
    expect(widgetSource).toContain('Action shown above');
  });

  it('returns null when attendance risk and academic struggle are both zero', () => {
    expect(renderLearnersAtRisk()).toBe('');
  });

  it('renders only Attendance Risk when attendance risk exists', () => {
    const html = renderLearnersAtRisk({
      attendanceRiskCount: 3,
      attendanceRiskLearnerCount: 2,
    });

    expect(html).toContain('Attendance Risk');
    expect(html).not.toContain('Academic Struggle');
    expect(html).not.toContain('No current attendance risk');
  });

  it('renders only Academic Struggle when needsSupport exists', () => {
    const html = renderLearnersAtRisk({ needsSupport: 4 });

    expect(html).toContain('Academic Struggle');
    expect(html).not.toContain('Attendance Risk');
  });

  it('returns null when there is no actionable assessment work', () => {
    expect(renderAssessmentsSummaryCard()).toBe('');
  });

  it('renders assessments when pending review rows exist', () => {
    const pendingRow = buildPendingScore();
    const queue = buildTeachingActionQueue({
      pendingAssessmentRows: [pendingRow],
      pendingAssessmentReviewCount: 1,
      teachingLoadCount: 1,
      now: new Date('2026-06-29T10:00:00Z'),
    });
    const html = renderAssessmentsSummaryCard({
      needsGrading: 1,
      pendingReviewRows: [pendingRow],
      queue,
    });

    expect(html).toContain('Assessments &amp; Grading');
    expect(html).toContain('Amina Otieno');
    expect(queue.primaryAction?.primaryHref).toBe('/assessments/91?focus=score-entry&student=301');
  });

  it('renders assessments when unfinalized lifecycle work exists', () => {
    const queue = buildTeachingActionQueue({
      assessments: [buildAssessment()],
      teachingLoadCount: 1,
      now: new Date('2026-06-29T10:00:00Z'),
    });
    const html = renderAssessmentsSummaryCard({ queue });

    expect(html).toContain('Assessment work');
    expect(html).toContain('Matter quiz');
    expect(queue.primaryAction?.primaryHref).toBe('/assessments/91?focus=prepare');
  });
});
