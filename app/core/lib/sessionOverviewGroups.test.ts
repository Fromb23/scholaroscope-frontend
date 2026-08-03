import { describe, expect, it } from 'vitest';

import {
  buildSessionClassGroups,
  buildSessionInstructorGroups,
  getSessionCohortSubjectGroupKey,
  pruneExpandedSessionGroup,
  toggleExpandedSessionGroup,
} from '@/app/core/lib/sessionOverviewGroups';
import type { Session } from '@/app/core/types/session';

function session(overrides: Partial<Session>): Session {
  return {
    id: 1,
    subject_source: 'kernel',
    session_subject_id: null,
    cambridge_cohort_subject_id: null,
    offering_id: null,
    cohort_subject: 11,
    cohort_id: 7,
    cohort_name: 'Yellow',
    cohort_level: 'Grade 10',
    subject_id: 101,
    subject_name: 'Computer Studies',
    subject_code: 'CMP',
    curriculum_type: 'CBC',
    curriculum_name: 'CBC',
    is_current_year: true,
    academic_year_id: 2026,
    term: 3,
    term_name: 'Term 1',
    session_type: 'LESSON',
    session_type_display: 'Lesson',
    session_date: '2026-02-04',
    start_time: '08:00',
    end_time: '08:40',
    title: 'Lesson',
    status: 'SCHEDULED',
    description: '',
    venue: '',
    created_by: '',
    lesson_plan_id: null,
    lesson_plan_title: null,
    lesson_plan_status: null,
    planned_outcomes: [],
    taught_outcomes: [],
    is_unplanned: false,
    schedule_state: 'SCHEDULED_READY',
    is_overdue: false,
    scheduled_start_at: null,
    scheduled_end_at: null,
    can_start_now: false,
    needs_completion: false,
    start_available_at: null,
    attendance_count: {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      sick: 0,
      unmarked: 0,
    },
    created_at: '2026-02-04T08:00:00Z',
    linked_cohorts: [],
    ...overrides,
  };
}

describe('session overview accordion helpers', () => {
  it('uses a single nullable expanded-group key', () => {
    expect(toggleExpandedSessionGroup(null, 'kernel:11')).toBe('kernel:11');
    expect(toggleExpandedSessionGroup('kernel:11', 'kernel:12')).toBe('kernel:12');
    expect(toggleExpandedSessionGroup('kernel:12', 'kernel:12')).toBeNull();
  });

  it('clears a stale expanded key only when filtering removes that group', () => {
    expect(pruneExpandedSessionGroup('kernel:11', ['kernel:11', 'kernel:12'])).toBe('kernel:11');
    expect(pruneExpandedSessionGroup('kernel:11', ['kernel:12'])).toBeNull();
    expect(pruneExpandedSessionGroup(null, ['kernel:12'])).toBeNull();
  });

  it('groups kernel and Cambridge sessions by authoritative cohort-subject identity', () => {
    const groups = buildSessionClassGroups([
      session({ id: 1, cohort_subject: 11, subject_name: 'Computer Studies' }),
      session({ id: 2, cohort_subject: 12, subject_name: 'Mathematics' }),
      session({
        id: 3,
        subject_source: 'cambridge',
        cohort_subject: null,
        cambridge_cohort_subject_id: 41,
        subject_name: 'Physics',
      }),
    ]);

    expect(groups.map((group) => group.key)).toEqual([
      'kernel:11',
      'kernel:12',
      'cambridge:41',
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      'Yellow Grade 10 · Computer Studies',
      'Yellow Grade 10 · Mathematics',
      'Yellow Grade 10 · Physics',
    ]);
  });

  it('does not merge records with missing cohort-subject links into an ambiguous group', () => {
    expect(getSessionCohortSubjectGroupKey(session({
      id: 20,
      cohort_subject: null,
      session_subject_id: null,
      cambridge_cohort_subject_id: null,
    }))).toBe('session:20');
    expect(getSessionCohortSubjectGroupKey(session({
      id: 21,
      cohort_subject: null,
      session_subject_id: null,
      cambridge_cohort_subject_id: null,
    }))).toBe('session:21');
  });

  it('uses the same cohort-subject boundary for instructor supervision groups', () => {
    const groups = buildSessionInstructorGroups([
      session({ id: 1, cohort_subject: 11, subject_name: 'Computer Studies' }),
      session({ id: 2, cohort_subject: 12, subject_name: 'Mathematics' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.sections.map((section) => section.key)).toEqual(['kernel:11', 'kernel:12']);
  });

  it('preserves sorted session items and instructor item counts', () => {
    const groups = buildSessionInstructorGroups([
      session({
        id: 1,
        cohort_subject: 11,
        subject_name: 'Computer Studies',
        session_date: '2026-02-04',
        start_time: '09:00',
      }),
      session({
        id: 2,
        cohort_subject: 11,
        subject_name: 'Computer Studies',
        session_date: '2026-02-05',
        start_time: '08:00',
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.itemCount).toBe(2);
    expect(groups[0]?.sections).toHaveLength(1);
    expect(groups[0]?.sections[0]?.items.map((item) => item.id)).toEqual([1, 2]);
  });
});
