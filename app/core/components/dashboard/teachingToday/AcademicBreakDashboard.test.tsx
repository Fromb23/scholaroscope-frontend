import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AcademicBreakDashboard } from './AcademicBreakDashboard';
import type { TeachingTodayContext } from '@/app/core/hooks/useTeachingToday';
import type { Session } from '@/app/core/types/session';

function buildSession(overrides: Partial<Session> = {}): Session {
    return {
        linked_cohorts: [],
        id: 10,
        subject_source: 'kernel',
        session_subject_id: 4,
        cambridge_cohort_subject_id: null,
        offering_id: null,
        cohort_subject: 4,
        cohort_id: 2,
        cohort_name: 'Grade 10 East',
        cohort_level: 'Grade 10',
        subject_id: 7,
        subject_name: 'Computer Studies',
        subject_code: 'CS',
        curriculum_type: 'CBE',
        curriculum_name: 'CBC',
        is_current_year: true,
        academic_year_id: 1,
        term: 3,
        term_name: 'Term 2',
        session_type: 'LESSON',
        session_type_display: 'Lesson',
        session_date: '2026-02-12',
        start_time: '09:00:00',
        end_time: '09:40:00',
        title: 'Secondary Storage',
        status: 'SCHEDULED',
        description: '',
        venue: 'Lab',
        created_by: '1',
        created_by_id: 1,
        created_by_name: 'Teacher One',
        created_by_email: 'teacher@example.com',
        lesson_plan_id: 12,
        lesson_plan_title: 'Secondary Storage',
        lesson_plan_status: 'REVIEWED',
        planned_outcomes: [],
        taught_outcomes: [],
        is_unplanned: false,
        schedule_state: 'SCHEDULED_PAUSED',
        is_overdue: false,
        scheduled_start_at: '2026-02-12T09:00:00+03:00',
        scheduled_end_at: '2026-02-12T09:40:00+03:00',
        can_start_now: false,
        can_reschedule: true,
        needs_completion: false,
        start_available_at: '2026-02-12T08:55:00+03:00',
        start_available_date: '2026-02-12',
        start_available_time: '08:55:00',
        attendance_count: {
            total: 30,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            sick: 0,
            unmarked: 30,
        },
        created_at: '2026-02-01T08:00:00Z',
        ...overrides,
    };
}

function buildContext(mode: 'MIDTERM_BREAK' | 'MIDTERM_EXAM'): TeachingTodayContext {
    const pausedSession = buildSession();
    return {
        todayKey: '2026-02-12',
        currentYear: null,
        currentTerm: {
            id: 3,
            academic_year: 1,
            academic_year_name: '2026',
            name: 'Term 2',
            sequence: 2,
            start_date: '2026-01-05',
            end_date: '2026-04-03',
            status: 'OPEN',
            is_frozen: false,
            calendar_setup_completed_at: null,
            calendar_setup_completed_by: null,
            calendar_setup_completed_by_name: '',
            is_calendar_setup_complete: false,
            week_count: 13,
            created_at: '2026-01-01T00:00:00Z',
        },
        currentWeek: 6,
        setupStatus: null,
        calendarEventsToday: [],
        calendarAffectsLearning: true,
        todayMode: {
            mode,
            event: {
                id: 5,
                title: mode === 'MIDTERM_BREAK' ? 'Midterm Break' : 'Midterm Exams',
                event_type: mode,
                start_date: '2026-02-10',
                end_date: '2026-02-14',
                affects_learning: true,
            },
            message: '',
            teaching_paused: true,
            allows_cleanup: true,
            allows_new_teaching: false,
            resumes_on: '2026-02-15',
        },
        normalTeachingExpected: false,
        learningDayState: mode === 'MIDTERM_BREAK' ? 'MIDTERM_BREAK' : 'EXAM_DAY',
        sessions: {
            overdueOpen: [],
            active: [],
            ready: [],
            overdueScheduled: [],
            upcoming: [pausedSession],
            completed: [],
            locked: [],
        },
        timeline: [pausedSession],
        incomplete: [
            {
                id: 'cleanup-1',
                group: 'NEEDS_COMPLETION',
                session: buildSession({ id: 11, status: 'IN_PROGRESS', schedule_state: 'IN_PROGRESS' }),
                title: 'Needs completion',
                detail: 'Record can be completed.',
                missing: [],
                actionLabel: 'Finish lesson record',
                actionHref: '/sessions/11',
                severity: 'warning',
            },
        ],
        nextAction: null,
        afterTeaching: {
            pendingAssessmentReviewCount: 3,
            pendingReviewRows: [],
        },
        teachingLoad: [
            {
                cohort_id: 2,
                cohort_name: 'Grade 10 East',
                subject_id: 7,
                subject_name: 'Computer Studies',
                level: 'Grade 10',
                academic_year: '2026',
                is_current_year: true,
                curriculum_type: 'CBE',
                covered: 4,
                total: 8,
                start_date: '2026-01-05',
                percentage: 50,
            },
        ],
    };
}

function renderDashboard(mode: 'MIDTERM_BREAK' | 'MIDTERM_EXAM') {
    return renderToStaticMarkup(
        createElement(AcademicBreakDashboard, {
            context: buildContext(mode),
            lastRefresh: new Date('2026-02-12T08:00:00Z'),
            onRefresh: () => undefined,
            variant: mode === 'MIDTERM_BREAK' ? 'break' : 'exam',
        })
    );
}

describe('AcademicBreakDashboard', () => {
    it('replaces normal teaching pressure during midterm break with soft copy and cleanup options', () => {
        const html = renderDashboard('MIDTERM_BREAK');

        expect(html).toContain('Midterm Break');
        expect(html).toContain('Teaching is paused for the midterm break');
        expect(html).toContain('No normal teaching sessions are expected today.');
        expect(html).toContain('This lesson record can be finished when you are ready.');
        expect(html).toContain('Reports &amp; intelligence');
        expect(html).toContain('After the break');
        expect(html).not.toContain('Start lesson');
        expect(html).not.toContain('Take attendance');
        expect(html).not.toContain('You are behind');
        expect(html).not.toContain('failed');
        expect(html).not.toContain('inactive');
    });

    it('emphasizes assessment and reporting during midterm exam mode', () => {
        const html = renderDashboard('MIDTERM_EXAM');

        expect(html).toContain('Midterm Exams');
        expect(html).toContain('Teaching is paused while assessment and reporting take priority.');
        expect(html).toContain('Exam reports, pending grading, and learner performance summaries take priority.');
        expect(html).toContain('Record assessment marks');
    });
});
