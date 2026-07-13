import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getSessionWorkflowOrderingPriority,
  summarizeSessionGroupStatus,
} from './InstructorProgressComponents';
import type { Session, SessionWorkflowSummary } from '@/app/core/types/session';

const componentSource = readFileSync(
  join(process.cwd(), 'app/core/components/instructors/InstructorProgressComponents.tsx'),
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

  it('keeps mobile rows readable without a fixed minimum table width', () => {
    expect(componentSource).not.toContain('min-w-[480px]');
    expect(componentSource).toContain('flex flex-col gap-3');
  });

  it('keeps returnTo navigation on session row links', () => {
    expect(componentSource).toContain('new URLSearchParams({ returnTo })');
    expect(componentSource).toContain('buildSessionDetailHref(session.id, returnTo)');
  });
});
