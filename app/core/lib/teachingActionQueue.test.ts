import { describe, expect, it } from 'vitest';
import {
  buildTeachingActionQueue,
  getSessionTeachingObjectKey,
} from './teachingActionQueue';
import type { AssignmentTeachingTodayItem } from '@/app/core/types/assignments';
import type { Session, SessionLifecycleReminder } from '@/app/core/types/session';

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    linked_cohorts: [],
    id: 123,
    subject_source: 'kernel',
    session_subject_id: null,
    cambridge_cohort_subject_id: null,
    offering_id: null,
    cohort_subject: 44,
    cohort_id: 7,
    cohort_name: 'Grade 7',
    cohort_level: 'Grade 7',
    subject_id: 9,
    subject_name: 'Applied Agriculture',
    subject_code: 'AGR',
    curriculum_type: 'CBC',
    curriculum_name: 'CBC',
    is_current_year: true,
    academic_year_id: 1,
    term: 1,
    term_name: 'Term 1',
    session_type: 'LESSON',
    session_type_display: 'Lesson',
    session_date: '2026-06-29',
    start_time: '08:00:00',
    end_time: '09:00:00',
    title: 'Soil care',
    status: 'SCHEDULED',
    description: '',
    venue: 'Room 1',
    created_by: 'teacher@example.com',
    lesson_plan_id: 55,
    lesson_plan_title: 'Soil care',
    lesson_plan_status: 'APPROVED',
    planned_outcomes: [],
    taught_outcomes: [],
    is_unplanned: false,
    schedule_state: 'SCHEDULED_READY',
    is_overdue: false,
    scheduled_start_at: '2026-06-29T08:00:00Z',
    scheduled_end_at: '2026-06-29T09:00:00Z',
    can_start_now: true,
    start_available_at: null,
    attendance_count: {
      total: 20,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      sick: 0,
      unmarked: 20,
    },
    created_at: '2026-06-29T07:00:00Z',
    ...overrides,
  };
}

function buildAssignmentWork(overrides: Partial<AssignmentTeachingTodayItem> = {}): AssignmentTeachingTodayItem {
  return {
    assignment_id: 45,
    title: 'Kitchen garden observation',
    cohort: { id: 7, name: 'Grade 7' },
    subject: { id: 9, name: 'Applied Agriculture' },
    lesson_plan: { id: 55, title: 'Soil care' },
    source: 'lesson_preparation',
    lifecycle_stage: 'ISSUED',
    teacher_stage_label: 'Responses',
    next_action: 'REVIEW_WORK',
    next_action_label: 'Review learner work',
    next_action_href: '/academic/cohorts/7/assignments/45',
    due_at: '2026-06-29T12:00:00Z',
    starts_at: null,
    urgency: 'normal',
    reminder_type: 'ASSIGNMENT_PENDING_REVIEW',
    counts: {
      recipients: 20,
      submissions: 12,
      pending_reviews: 4,
      missing: 0,
      evidence_pending: 0,
    },
    requires_attachments: false,
    has_cbc_outcomes: true,
    evidence_blocked: false,
    evidence_blocked_reason: '',
    ready_for_next_action: true,
    blocking_items: [],
    warnings: [],
    ...overrides,
  };
}

describe('teachingActionQueue', () => {
  it('ranks open lesson closure above workspace shortcuts', () => {
    const openSession = buildSession({
      status: 'IN_PROGRESS',
      schedule_state: 'IN_PROGRESS_OVERDUE',
      needs_completion: true,
    });

    const queue = buildTeachingActionQueue({
      sessions: [openSession],
      teachingLoadCount: 1,
      workspaceShortcuts: [{ id: 'lesson-plans', label: 'Lesson preparations', href: '/lesson-plans' }],
      now: new Date('2026-06-29T10:00:00Z'),
    });

    expect(queue.primaryAction?.dedupeKey).toBe('session:123:end_lesson');
    expect(queue.primaryAction?.primaryLabel).toBe('End lesson');
    expect(queue.quiet).toBe(false);
  });

  it('includes assignment workflow items from teaching today memory', () => {
    const queue = buildTeachingActionQueue({
      assignmentWork: [buildAssignmentWork()],
      teachingLoadCount: 1,
      now: new Date('2026-06-29T10:00:00Z'),
    });

    expect(queue.primaryAction?.objectType).toBe('assignment');
    expect(queue.primaryAction?.objectKey).toBe('assignment:45');
    expect(queue.primaryAction?.primaryLabel).toBe('Review learner work');
  });

  it('includes lesson-originated assignment actions with lesson plan context', () => {
    const queue = buildTeachingActionQueue({
      assignmentWork: [buildAssignmentWork()],
      teachingLoadCount: 1,
      now: new Date('2026-06-29T10:00:00Z'),
    });

    expect(queue.primaryAction?.objectType).toBe('assignment');
    expect(queue.primaryAction?.source).toBe('lesson_preparation');
    expect(queue.primaryAction?.assignmentWork?.lesson_plan?.title).toBe('Soil care');
    expect(queue.primaryAction?.secondaryActions).toEqual([
      { label: 'Open lesson plan', href: '/lesson-plans/55' },
    ]);
  });

  it('keeps preparing, issued, and reviewing assignment workflow items active', () => {
    const queue = buildTeachingActionQueue({
      assignmentWork: [
        buildAssignmentWork({
          assignment_id: 41,
          lifecycle_stage: 'PREPARING',
          next_action: 'ISSUE_ASSIGNMENT',
          next_action_label: 'Issue learner task',
          teacher_stage_label: 'Prepared',
        }),
        buildAssignmentWork({
          assignment_id: 42,
          lifecycle_stage: 'ISSUED',
          next_action: 'RECORD_SUBMISSION',
          next_action_label: 'Record learner responses',
          teacher_stage_label: 'Issued',
        }),
        buildAssignmentWork({
          assignment_id: 43,
          lifecycle_stage: 'REVIEWING',
          next_action: 'STORE_RECORD',
          next_action_label: 'Store record',
          teacher_stage_label: 'Ready to store',
        }),
      ],
      teachingLoadCount: 1,
      now: new Date('2026-06-29T10:00:00Z'),
    });

    expect(queue.actions.filter((action) => action.objectType === 'assignment')).toHaveLength(3);
    expect(queue.actions.map((action) => action.objectKey)).toEqual(
      expect.arrayContaining(['assignment:41', 'assignment:42', 'assignment:43'])
    );
  });

  it('does not keep stored assignments in active teaching memory', () => {
    const queue = buildTeachingActionQueue({
      assignmentWork: [
        buildAssignmentWork({
          assignment_id: 46,
          lifecycle_stage: 'STORED',
          next_action: 'VIEW_RECORD',
          next_action_label: 'View record',
          teacher_stage_label: 'Stored',
        }),
      ],
      teachingLoadCount: 1,
      now: new Date('2026-06-29T10:00:00Z'),
    });

    expect(queue.actions.some((action) => action.objectKey === 'assignment:46')).toBe(false);
    expect(queue.quiet).toBe(true);
  });

  it('deduplicates the same session action across reminders and today sessions', () => {
    const openSession = buildSession({
      status: 'IN_PROGRESS',
      schedule_state: 'IN_PROGRESS_OVERDUE',
      needs_completion: true,
    });
    const reminder: SessionLifecycleReminder = {
      session: openSession,
      type: 'NEEDS_CLOSING',
      label: 'Needs closing',
      severity: 'warning',
    };

    const queue = buildTeachingActionQueue({
      sessions: [openSession],
      sessionReminders: [reminder],
      teachingLoadCount: 1,
      now: new Date('2026-06-29T10:00:00Z'),
    });

    expect(queue.actions.filter((action) => action.objectKey === getSessionTeachingObjectKey(123))).toHaveLength(1);
    expect(queue.suppressedObjectKeys).toContain('session:123');
    expect(queue.suppressedDedupeKeys).toContain('session:123:end_lesson');
  });
});
