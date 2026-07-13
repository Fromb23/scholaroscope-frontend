import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getSessionWorkflowOrderingPriority,
  sessionMatchesPlanningReviewScope,
  sessionNeedsPlanningAttention,
  summarizeSessionGroupStatus,
} from './InstructorProgressComponents';
import type { Session, SessionWorkflowSummary } from '@/app/core/types/session';

const componentSource = readFileSync(
  join(process.cwd(), 'app/core/components/instructors/InstructorProgressComponents.tsx'),
  'utf8',
);
const progressPageSource = readFileSync(
  join(process.cwd(), 'app/core/components/admin/instructors/InstructorProgressPage.tsx'),
  'utf8',
);

function workflowSummary(
  lifecycleStatus: SessionWorkflowSummary['lifecycle_status'],
  lifecycleLabel: string,
  stage: SessionWorkflowSummary['stage'] = 'EVIDENCE',
): SessionWorkflowSummary {
  return {
    stage,
    stage_label: stage === 'EVIDENCE' ? 'Record learner performance' : lifecycleLabel,
    message: 'Workflow message',
    missing: stage === 'EVIDENCE' ? ['evidence'] : [],
    missing_labels: stage === 'EVIDENCE' ? ['Learner performance'] : [],
    ready_to_close: stage === 'READY',
    needs_teacher_action: !['COMPLETED', 'CANCELLED', 'REQUIRES_REVIEW'].includes(stage),
    action_owner: ['COMPLETED', 'CANCELLED'].includes(stage) ? 'NONE' : 'INSTRUCTOR',
    viewer_can_advance: false,
    lifecycle_status: lifecycleStatus,
    lifecycle_label: lifecycleLabel,
  };
}

function session(overrides: Partial<Session>): Session {
  return {
    linked_cohorts: [],
    id: 1,
    subject_source: 'kernel',
    session_subject_id: 1,
    cambridge_cohort_subject_id: null,
    offering_id: null,
    cohort_subject: 1,
    cohort_id: 10,
    cohort_name: 'Grade 7',
    cohort_level: 'Grade 7',
    subject_id: 20,
    subject_name: 'Computer Studies',
    subject_code: 'COMP',
    curriculum_type: 'CBE',
    curriculum_name: 'CBC',
    is_current_year: true,
    academic_year_id: 1,
    term: 1,
    term_name: 'Term 1',
    session_type: 'LESSON',
    session_type_display: 'Lesson',
    session_date: '2026-07-13',
    start_time: '08:00:00',
    end_time: '09:00:00',
    title: 'Computer Studies',
    status: 'IN_PROGRESS',
    description: '',
    venue: 'Lab',
    created_by: '1',
    lesson_plan_id: 1,
    lesson_plan_title: 'Computer Studies',
    lesson_plan_status: 'SCHEDULED',
    planned_outcomes: [],
    taught_outcomes: [],
    is_unplanned: false,
    schedule_state: 'IN_PROGRESS',
    is_overdue: false,
    scheduled_start_at: null,
    scheduled_end_at: null,
    can_start_now: false,
    can_reschedule: false,
    needs_completion: false,
    start_available_at: null,
    attendance_count: {
      total: 10,
      present: 8,
      absent: 1,
      late: 1,
      excused: 0,
      sick: 0,
      unmarked: 0,
    },
    created_at: '2026-07-13T08:00:00Z',
    ...overrides,
  };
}

describe('Instructor progress session workflow rows', () => {
  it('orders needs-completion sessions before completed sessions', () => {
    const needsCompletion = session({
      id: 1,
      workflow_summary: workflowSummary('NEEDS_COMPLETION', 'Needs completion'),
    });
    const completed = session({
      id: 2,
      status: 'COMPLETED',
      workflow_summary: workflowSummary('COMPLETED', 'Completed', 'COMPLETED'),
    });

    const ordered = [completed, needsCompletion].sort(
      (a, b) => getSessionWorkflowOrderingPriority(a) - getSessionWorkflowOrderingPriority(b),
    );

    expect(ordered.map((item) => item.id)).toEqual([1, 2]);
  });

  it('summarizes cohort groups with meaningful workflow counts', () => {
    expect(summarizeSessionGroupStatus([
      session({ id: 1, workflow_summary: workflowSummary('NEEDS_COMPLETION', 'Needs completion') }),
      session({ id: 2, workflow_summary: workflowSummary('IN_PROGRESS', 'In progress', 'ATTENDANCE') }),
      session({ id: 3, workflow_summary: workflowSummary('COMPLETED', 'Completed', 'COMPLETED') }),
      session({ id: 4, workflow_summary: workflowSummary('COMPLETED', 'Completed', 'COMPLETED') }),
    ])).toBe('1 needs completion · 1 in progress · 2 completed');
  });

  it('renders server workflow fields and a neutral navigation action', () => {
    expect(componentSource).toContain('Current stage:');
    expect(componentSource).toContain('Missing:');
    expect(componentSource).toContain('Action owner:');
    expect(componentSource).toContain('Open lesson');
    expect(componentSource).toContain('workflow_summary?.lifecycle_label');
    expect(componentSource).toContain('workflow_summary?.missing_labels');
  });

  it('renders planning status from session lesson-plan fields', () => {
    expect(componentSource).toContain('lesson_plan_id === null');
    expect(componentSource).toContain('Lesson plan missing');
    expect(componentSource).toContain('lesson_plan_status');
    expect(componentSource).toContain('Plan: ${formatPlanStatus(session.lesson_plan_status)}');
    expect(componentSource).toContain('PLAN_STATUS_LABELS');
  });

  it('shows View plan only for linked lesson plans and preserves returnTo', () => {
    expect(componentSource).toContain('session.lesson_plan_id !== null');
    expect(componentSource).toContain('buildLessonPlanDetailHref(session.lesson_plan_id, returnTo)');
    expect(componentSource).toContain('View plan');
    expect(componentSource).toContain('new URLSearchParams({ returnTo })');
  });

  it('limits lesson-plan review mode to the supplied review scope', () => {
    const scope = {
      startDate: '2026-07-13',
      endDate: '2026-07-19',
      termId: 4,
      subjectId: 20,
      cohortId: 10,
    };

    expect(sessionMatchesPlanningReviewScope(session({
      term: 4,
      subject_id: 20,
      cohort_id: 10,
      session_date: '2026-07-15',
    }), scope)).toBe(true);
    expect(sessionMatchesPlanningReviewScope(session({
      term: 4,
      subject_id: 20,
      cohort_id: 10,
      session_date: '2026-07-20',
    }), scope)).toBe(false);
  });

  it('flags missing plans in review scope without treating cancelled sessions as urgent', () => {
    const scope = {
      startDate: '2026-07-13',
      endDate: '2026-07-19',
      termId: 1,
      subjectId: 20,
      cohortId: 10,
    };

    expect(sessionNeedsPlanningAttention(session({ lesson_plan_id: null }), scope)).toBe(true);
    expect(sessionNeedsPlanningAttention(session({ lesson_plan_id: null, status: 'CANCELLED' }), scope)).toBe(false);
    expect(sessionNeedsPlanningAttention(session({ lesson_plan_id: 12, lesson_plan_status: 'USED' }), scope)).toBe(false);
  });

  it('keeps review-mode sorting and auto-open behavior inside GroupedSessions', () => {
    expect(componentSource).toContain('planningDelta');
    expect(componentSource).toContain('defaultOpenGroupId');
    expect(componentSource).toContain('attentionGroup ?? groups[0]');
    expect(componentSource).toContain('Planning attention');
  });

  it('keeps session pagination functional', () => {
    expect(componentSource).toContain('const pageSize = 10');
    expect(componentSource).toContain('const paginated = group.sessions.slice');
    expect(componentSource).toContain('Page {page} of {totalPages}');
  });

  it('keeps mobile rows readable without a fixed minimum table width', () => {
    expect(componentSource).not.toContain('min-w-[480px]');
    expect(componentSource).toContain('flex flex-col gap-3');
    expect(componentSource).toContain('sm:flex-row');
  });

  it('keeps returnTo navigation on session row links', () => {
    expect(componentSource).toContain('new URLSearchParams({ returnTo })');
    expect(componentSource).toContain('buildSessionDetailHref(session.id, returnTo)');
    expect(componentSource).toContain('isSafeNextPath(returnTo)');
  });

  it('removes the duplicate Lesson Plans section while keeping Sessions and Schemes', () => {
    expect(progressPageSource).not.toContain('id="lesson-plans"');
    expect(progressPageSource).not.toContain('groupedLessonPlans');
    expect(progressPageSource).not.toContain('expandedLessonPlanTerms');
    expect(progressPageSource).not.toContain('getInstructorLessonPlans');
    expect(progressPageSource).toContain('<h2 className="text-lg font-semibold text-gray-900">Sessions</h2>');
    expect(progressPageSource).toContain('<h2 className="text-lg font-semibold text-gray-900">Schemes of Work</h2>');
  });

  it('uses the real Sessions card as the sessions hash target', () => {
    const sessionsCardIndex = progressPageSource.indexOf('<Card id="sessions">');
    const sessionsHeadingIndex = progressPageSource.indexOf('>Sessions</h2>', sessionsCardIndex);
    const attendanceHeadingIndex = progressPageSource.indexOf('Attendance Overview');

    expect(sessionsCardIndex).toBeGreaterThan(-1);
    expect(sessionsHeadingIndex).toBeGreaterThan(sessionsCardIndex);
    expect(attendanceHeadingIndex).toBeGreaterThan(-1);
    expect(attendanceHeadingIndex).toBeLessThan(sessionsCardIndex);
    expect(progressPageSource.match(/id="sessions"/g)?.length).toBe(1);
  });

  it('builds review-aware progress return navigation safely', () => {
    expect(progressPageSource).toContain('resolveProgressBackTarget');
    expect(progressPageSource).toContain('isSafeNextPath(returnTo)');
    expect(progressPageSource).toContain("label: 'Back to Lesson Plan Review'");
    expect(progressPageSource).toContain("label: 'Back to Staff'");
    expect(progressPageSource).toContain("href: '/admin/instructors'");
    expect(progressPageSource).toContain("searchParams.get('source') !== 'lesson-plan-review'");
  });

  it('passes full progress-page returnTo and review scope into grouped sessions', () => {
    expect(progressPageSource).toContain("return `${pathname}${query ? `?${query}` : ''}#sessions`");
    expect(progressPageSource).toContain('returnTo={progressReturnTo}');
    expect(progressPageSource).toContain('planningReviewScope={planningReviewScope}');
    expect(progressPageSource).toContain('review_start_date');
    expect(progressPageSource).toContain('review_end_date');
  });
});
