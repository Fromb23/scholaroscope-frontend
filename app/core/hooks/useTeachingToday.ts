import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import {
    useCurrentAcademicYear,
    useCurrentTerm,
    useTermCalendarEvents,
} from '@/app/core/hooks/useAcademic';
import { useMyTeachingLoad } from '@/app/core/hooks/useInstructorCohortAccess';
import { useTodaySessions } from '@/app/core/hooks/useSessions';
import { useSessionLifecycleReminders } from '@/app/core/hooks/useSessionLifecycleReminders';
import {
    useAssessmentReviewSummary,
    useAssessmentScores,
} from '@/app/core/hooks/useAssessments';
import type {
    AcademicSetupStatus,
    AcademicYear,
    TeachingAssignment,
    Term,
    TermCalendarEvent,
    TermCalendarEventType,
} from '@/app/core/types/academic';
import type { AssessmentScore } from '@/app/core/types/assessment';
import { AssessmentScoreStatus } from '@/app/core/types/assessment';
import type {
    Session,
    SessionLifecycleReminder,
    SessionLifecycleReminderType,
} from '@/app/core/types/session';

const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export type LearningDayState =
    | 'SETUP_BLOCKED'
    | 'NO_ACTIVE_TERM'
    | 'NORMAL_TEACHING_DAY'
    | 'EXAM_DAY'
    | 'MIDTERM_BREAK'
    | 'HOLIDAY'
    | 'PUBLIC_HOLIDAY'
    | 'SCHOOL_EVENT'
    | 'CLOSING_PERIOD';

export type TeachingTodayActionTone = 'info' | 'success' | 'warning' | 'danger';

export interface TeachingTodayAction {
    key: string;
    title: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel?: string;
    secondaryHref?: string;
    tone: TeachingTodayActionTone;
    session?: Session;
}

export interface TeachingTodaySessionGroups {
    overdueOpen: Session[];
    active: Session[];
    ready: Session[];
    overdueScheduled: Session[];
    upcoming: Session[];
    completed: Session[];
    locked: Session[];
}

export type TeachingTodayIncompleteGroup =
    | 'STILL_OPEN'
    | 'NEEDS_COMPLETION'
    | 'FORGOTTEN_PREVIOUS_DAY'
    | 'NEEDS_ATTENTION_BEFORE_END';

export interface TeachingTodayIncompleteItem {
    id: string;
    group: TeachingTodayIncompleteGroup;
    session: Session;
    title: string;
    detail: string;
    missing: string[];
    actionLabel: string;
    actionHref: string;
    severity: 'info' | 'warning' | 'danger';
}

export interface TeachingTodayContext {
    todayKey: string;
    currentYear: AcademicYear | null;
    currentTerm: Term | null;
    currentWeek: number | null;
    setupStatus: AcademicSetupStatus | null;
    calendarEventsToday: TermCalendarEvent[];
    calendarAffectsLearning: boolean;
    normalTeachingExpected: boolean;
    learningDayState: LearningDayState;
    sessions: TeachingTodaySessionGroups;
    timeline: Session[];
    incomplete: TeachingTodayIncompleteItem[];
    nextAction: TeachingTodayAction | null;
    afterTeaching: {
        pendingAssessmentReviewCount: number;
        pendingReviewRows: AssessmentScore[];
        learnerAttentionCount?: number;
    };
    teachingLoad: TeachingAssignment[];
}

export interface UseTeachingTodayResult {
    context: TeachingTodayContext;
    loading: boolean;
    error: string | null;
    lastRefresh: Date;
    refresh: () => Promise<void>;
}

function getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function dateKeyToTime(value: string): number | null {
    const timestamp = new Date(`${value}T00:00:00`).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
}

function isDateWithinRange(dateKey: string, startDate: string, endDate: string): boolean {
    return dateKey >= startDate && dateKey <= endDate;
}

function computeCurrentWeek(term: Term | null, todayKey: string): number | null {
    if (!term) return null;

    const today = dateKeyToTime(todayKey);
    const termStart = dateKeyToTime(term.start_date);

    if (today === null || termStart === null) return null;

    const rawWeek = Math.floor((today - termStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
    if (rawWeek < 1) return null;

    if (term.week_count > 0) {
        return Math.min(rawWeek, term.week_count);
    }

    return rawWeek;
}

function isClosingEvent(event: TermCalendarEvent): boolean {
    const text = `${event.title} ${event.notes}`.toLowerCase();
    return /\b(closing|close of term|end of term|term closes|school closes)\b/.test(text);
}

function eventTypeMatches(
    events: TermCalendarEvent[],
    types: TermCalendarEventType[]
): boolean {
    return events.some((event) => types.includes(event.event_type));
}

function deriveLearningDayState(
    setupStatus: AcademicSetupStatus | null,
    currentTerm: Term | null,
    calendarEventsToday: TermCalendarEvent[]
): LearningDayState {
    if (setupStatus && !setupStatus.complete) {
        return 'SETUP_BLOCKED';
    }

    if (!currentTerm) {
        return 'NO_ACTIVE_TERM';
    }

    if (eventTypeMatches(calendarEventsToday, ['PUBLIC_HOLIDAY'])) {
        return 'PUBLIC_HOLIDAY';
    }

    if (eventTypeMatches(calendarEventsToday, ['HOLIDAY'])) {
        return 'HOLIDAY';
    }

    if (eventTypeMatches(calendarEventsToday, ['MIDTERM_BREAK'])) {
        return 'MIDTERM_BREAK';
    }

    if (calendarEventsToday.some(isClosingEvent)) {
        return 'CLOSING_PERIOD';
    }

    if (eventTypeMatches(calendarEventsToday, [
        'ENTRY_EXAM',
        'MIDTERM_EXAM',
        'MAIN_EXAM',
        'EXIT_EXAM',
    ])) {
        return 'EXAM_DAY';
    }

    if (calendarEventsToday.length > 0) {
        return 'SCHOOL_EVENT';
    }

    return 'NORMAL_TEACHING_DAY';
}

function isSessionCompleted(session: Session): boolean {
    return session.status === 'COMPLETED' || session.schedule_state === 'COMPLETED';
}

function isSessionScheduled(session: Session): boolean {
    return session.status === 'SCHEDULED';
}

function isSessionCancelled(session: Session): boolean {
    return session.status === 'CANCELLED';
}

function isOverdueOpenSession(session: Session): boolean {
    return session.status === 'IN_PROGRESS'
        && (session.schedule_state === 'IN_PROGRESS_OVERDUE' || Boolean(session.needs_completion));
}

function isActiveSession(session: Session): boolean {
    return session.status === 'IN_PROGRESS' && !isOverdueOpenSession(session);
}

function isReadySession(session: Session): boolean {
    return isSessionScheduled(session)
        && (session.schedule_state === 'SCHEDULED_READY' || session.can_start_now);
}

function isOverdueScheduledSession(session: Session): boolean {
    return isSessionScheduled(session) && session.schedule_state === 'SCHEDULED_OVERDUE';
}

function isLockedSession(session: Session): boolean {
    return isSessionScheduled(session) && session.schedule_state === 'SCHEDULED_LOCKED';
}

function sessionSortValue(session: Session): number {
    const scheduledStart = session.scheduled_start_at
        ? new Date(session.scheduled_start_at).getTime()
        : Number.NaN;

    if (!Number.isNaN(scheduledStart)) {
        return scheduledStart;
    }

    const timestamp = new Date(`${session.session_date}T${session.start_time ?? '23:59:59'}`).getTime();
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function sortSessions(sessions: Session[]): Session[] {
    return [...sessions].sort((left, right) => (
        sessionSortValue(left) - sessionSortValue(right)
        || left.subject_name.localeCompare(right.subject_name)
        || left.cohort_name.localeCompare(right.cohort_name)
    ));
}

function buildSessionGroups(sessions: Session[]): TeachingTodaySessionGroups {
    const ordered = sortSessions(sessions);

    return {
        overdueOpen: ordered.filter(isOverdueOpenSession),
        active: ordered.filter(isActiveSession),
        ready: ordered.filter(isReadySession),
        overdueScheduled: ordered.filter(isOverdueScheduledSession),
        upcoming: ordered.filter((session) => (
            isSessionScheduled(session)
            && !isReadySession(session)
            && !isOverdueScheduledSession(session)
            && !isLockedSession(session)
            && !isSessionCancelled(session)
        )),
        completed: ordered.filter(isSessionCompleted),
        locked: ordered.filter(isLockedSession),
    };
}

function getSessionLabel(session: Session): string {
    return `${session.subject_name} with ${session.cohort_name}`;
}

function getMissingWorkLabels(session: Session): string[] {
    const labels: string[] = [];
    const attendance = session.attendance_count;

    if (attendance.total > 0 && attendance.unmarked > 0) {
        labels.push(
            attendance.unmarked === attendance.total
                ? 'attendance missing'
                : `${attendance.unmarked} attendance mark${attendance.unmarked === 1 ? '' : 's'} missing`
        );
    }

    if (
        session.planned_outcomes.length > 0
        && session.taught_outcomes.length === 0
        && (session.status === 'IN_PROGRESS' || Boolean(session.needs_completion))
    ) {
        labels.push('taught outcomes not confirmed');
    }

    if (session.needs_completion || session.schedule_state === 'IN_PROGRESS_OVERDUE') {
        labels.push('lesson completion record incomplete');
    }

    if (session.schedule_state === 'SCHEDULED_OVERDUE') {
        labels.push('start, reschedule, or cancel decision needed');
    }

    return labels;
}

function mapReminderGroup(type: SessionLifecycleReminderType): TeachingTodayIncompleteGroup {
    switch (type) {
        case 'UNFINISHED_LESSON':
            return 'FORGOTTEN_PREVIOUS_DAY';
        case 'NEEDS_CLOSING':
            return 'NEEDS_COMPLETION';
        case 'OPEN_LESSON':
        default:
            return 'STILL_OPEN';
    }
}

function buildIncompleteItemFromReminder(
    reminder: SessionLifecycleReminder
): TeachingTodayIncompleteItem {
    const { session } = reminder;
    const group = mapReminderGroup(reminder.type);

    if (group === 'FORGOTTEN_PREVIOUS_DAY') {
        return {
            id: `reminder-${reminder.type}-${session.id}`,
            group,
            session,
            title: 'Forgotten from a previous day',
            detail: `${getSessionLabel(session)} is still open from ${session.session_date}.`,
            missing: getMissingWorkLabels(session),
            actionLabel: 'Finish lesson record',
            actionHref: `/sessions/${session.id}?section=complete&notice=session-current-step`,
            severity: 'danger',
        };
    }

    if (group === 'NEEDS_COMPLETION') {
        return {
            id: `reminder-${reminder.type}-${session.id}`,
            group,
            session,
            title: 'Needs completion',
            detail: `${getSessionLabel(session)} has passed the scheduled end and still needs closure.`,
            missing: getMissingWorkLabels(session),
            actionLabel: 'End lesson',
            actionHref: `/sessions/${session.id}?section=complete&notice=session-current-step`,
            severity: 'warning',
        };
    }

    return {
        id: `reminder-${reminder.type}-${session.id}`,
        group,
        session,
        title: 'Still open',
        detail: `${getSessionLabel(session)} is in progress.`,
        missing: getMissingWorkLabels(session),
        actionLabel: 'Continue lesson',
        actionHref: `/sessions/${session.id}?notice=session-current-step`,
        severity: 'info',
    };
}

function buildIncompleteItemFromSession(session: Session): TeachingTodayIncompleteItem | null {
    if (isOverdueOpenSession(session)) {
        return {
            id: `session-open-overdue-${session.id}`,
            group: 'NEEDS_COMPLETION',
            session,
            title: 'Needs completion',
            detail: `${getSessionLabel(session)} has passed the scheduled end and is still open.`,
            missing: getMissingWorkLabels(session),
            actionLabel: 'End lesson',
            actionHref: `/sessions/${session.id}?section=complete&notice=session-current-step`,
            severity: 'warning',
        };
    }

    if (isActiveSession(session)) {
        return {
            id: `session-open-${session.id}`,
            group: 'STILL_OPEN',
            session,
            title: 'Still open',
            detail: `${getSessionLabel(session)} is currently in progress.`,
            missing: getMissingWorkLabels(session),
            actionLabel: 'Continue lesson',
            actionHref: `/sessions/${session.id}?notice=session-current-step`,
            severity: 'info',
        };
    }

    if (isOverdueScheduledSession(session)) {
        return {
            id: `session-scheduled-overdue-${session.id}`,
            group: 'NEEDS_ATTENTION_BEFORE_END',
            session,
            title: 'Needs attention before today ends',
            detail: `${getSessionLabel(session)} was scheduled earlier but has not started.`,
            missing: getMissingWorkLabels(session),
            actionLabel: 'Open lesson',
            actionHref: `/sessions/${session.id}`,
            severity: 'warning',
        };
    }

    return null;
}

function buildIncompleteItems(
    reminders: SessionLifecycleReminder[],
    todaySessions: Session[]
): TeachingTodayIncompleteItem[] {
    const seen = new Set<number>();
    const items: TeachingTodayIncompleteItem[] = [];

    reminders.forEach((reminder) => {
        seen.add(reminder.session.id);
        items.push(buildIncompleteItemFromReminder(reminder));
    });

    todaySessions.forEach((session) => {
        if (seen.has(session.id)) return;

        const item = buildIncompleteItemFromSession(session);
        if (item) {
            items.push(item);
        }
    });

    const groupPriority: Record<TeachingTodayIncompleteGroup, number> = {
        STILL_OPEN: 0,
        NEEDS_COMPLETION: 1,
        FORGOTTEN_PREVIOUS_DAY: 2,
        NEEDS_ATTENTION_BEFORE_END: 3,
    };

    return items.sort((left, right) => (
        groupPriority[left.group] - groupPriority[right.group]
        || sessionSortValue(left.session) - sessionSortValue(right.session)
    ));
}

function hasMissingLessonPlan(session: Session): boolean {
    return isSessionScheduled(session) && !session.lesson_plan_id;
}

function hasUnreviewedLessonPlan(session: Session): boolean {
    const status = session.lesson_plan_status?.trim().toUpperCase();
    return isSessionScheduled(session)
        && Boolean(session.lesson_plan_id)
        && (status === 'DRAFT' || status === 'GENERATED');
}

function buildNextAction(args: {
    groups: TeachingTodaySessionGroups;
    timeline: Session[];
    incomplete: TeachingTodayIncompleteItem[];
    learningDayState: LearningDayState;
    normalTeachingExpected: boolean;
    pendingAssessmentReviewCount: number;
    teachingLoad: TeachingAssignment[];
}): TeachingTodayAction | null {
    const {
        groups,
        timeline,
        incomplete,
        learningDayState,
        normalTeachingExpected,
        pendingAssessmentReviewCount,
        teachingLoad,
    } = args;

    const overdueOpen = groups.overdueOpen[0];
    if (overdueOpen) {
        return {
            key: 'end-overdue-open-lesson',
            title: 'Finish the open lesson',
            description: `${getSessionLabel(overdueOpen)} is still open after its scheduled end. Close the record before the day moves on.`,
            primaryLabel: 'End lesson',
            primaryHref: `/sessions/${overdueOpen.id}?section=complete&notice=session-current-step`,
            secondaryLabel: 'Review attendance',
            secondaryHref: `/sessions/${overdueOpen.id}?section=attendance&notice=session-current-step`,
            tone: 'danger',
            session: overdueOpen,
        };
    }

    const active = groups.active[0];
    if (active) {
        return {
            key: 'continue-active-lesson',
            title: 'Continue the lesson in progress',
            description: `${getSessionLabel(active)} is open now. Keep attendance and taught outcomes current before closing it.`,
            primaryLabel: 'Continue lesson',
            primaryHref: `/sessions/${active.id}?notice=session-current-step`,
            secondaryLabel: 'Review attendance',
            secondaryHref: `/sessions/${active.id}?section=attendance&notice=session-current-step`,
            tone: 'warning',
            session: active,
        };
    }

    const ready = groups.ready[0];
    if (ready) {
        return {
            key: 'start-ready-lesson',
            title: ready.session_type === 'EXAM' || learningDayState === 'EXAM_DAY'
                ? 'Open the exam session'
                : 'Start the next lesson',
            description: `${getSessionLabel(ready)} is ready${ready.venue ? ` in ${ready.venue}` : ''}.`,
            primaryLabel: 'Start lesson',
            primaryHref: `/sessions/${ready.id}`,
            secondaryLabel: ready.lesson_plan_id ? 'Review lesson plan' : 'Prepare lesson',
            secondaryHref: ready.lesson_plan_id ? `/lesson-plans/${ready.lesson_plan_id}` : '/lesson-plans/new',
            tone: 'success',
            session: ready,
        };
    }

    const overdueScheduled = groups.overdueScheduled[0];
    if (overdueScheduled) {
        return {
            key: 'open-overdue-scheduled-lesson',
            title: 'Decide on the missed start',
            description: `${getSessionLabel(overdueScheduled)} was scheduled earlier today but has not started. Start it, reschedule it, or cancel it from the lesson record.`,
            primaryLabel: 'Open lesson',
            primaryHref: `/sessions/${overdueScheduled.id}`,
            secondaryLabel: "Open today's sessions",
            secondaryHref: '/sessions/today',
            tone: 'warning',
            session: overdueScheduled,
        };
    }

    const scheduledForPlanning = timeline.filter((session) => (
        isSessionScheduled(session)
        && !isOverdueScheduledSession(session)
        && !isSessionCancelled(session)
    ));

    const missingPlan = scheduledForPlanning.find(hasMissingLessonPlan);
    if (missingPlan && normalTeachingExpected) {
        return {
            key: 'prepare-missing-plan',
            title: 'Prepare a lesson before it starts',
            description: `${getSessionLabel(missingPlan)} does not have a linked lesson plan yet.`,
            primaryLabel: 'Prepare lesson',
            primaryHref: '/lesson-plans/new',
            secondaryLabel: 'Open lesson',
            secondaryHref: `/sessions/${missingPlan.id}`,
            tone: 'info',
            session: missingPlan,
        };
    }

    const unreviewedPlan = scheduledForPlanning.find(hasUnreviewedLessonPlan);
    if (unreviewedPlan && normalTeachingExpected) {
        return {
            key: 'review-unreviewed-plan',
            title: 'Review the lesson plan',
            description: `${getSessionLabel(unreviewedPlan)} has a ${unreviewedPlan.lesson_plan_status?.toLowerCase() ?? 'draft'} plan that should be checked before teaching.`,
            primaryLabel: 'Review lesson plan',
            primaryHref: unreviewedPlan.lesson_plan_id ? `/lesson-plans/${unreviewedPlan.lesson_plan_id}` : '/lesson-plans',
            secondaryLabel: 'Open lesson',
            secondaryHref: `/sessions/${unreviewedPlan.id}`,
            tone: 'info',
            session: unreviewedPlan,
        };
    }

    if (timeline.length === 0 && incomplete.length > 0) {
        return {
            key: 'clear-incomplete-work',
            title: 'Clear unfinished teaching records',
            description: 'No lesson is scheduled for today, but there is unfinished work from lessons that still need attention.',
            primaryLabel: 'Open incomplete work',
            primaryHref: incomplete[0].actionHref,
            secondaryLabel: "Open today's sessions",
            secondaryHref: '/sessions/today',
            tone: 'warning',
            session: incomplete[0].session,
        };
    }

    if (learningDayState === 'EXAM_DAY' && pendingAssessmentReviewCount > 0) {
        return {
            key: 'exam-day-records',
            title: 'Handle exam-day records when ready',
            description: `${pendingAssessmentReviewCount} assessment record${pendingAssessmentReviewCount === 1 ? '' : 's'} need review. Keep this secondary until exam duties are done.`,
            primaryLabel: 'Open assessments',
            primaryHref: '/assessments?status=pending',
            secondaryLabel: "Open today's sessions",
            secondaryHref: '/sessions/today',
            tone: 'info',
        };
    }

    if (timeline.length > 0) {
        return {
            key: 'open-today-sessions',
            title: normalTeachingExpected ? "Follow today's timeline" : 'Check the sessions listed for today',
            description: normalTeachingExpected
                ? "Nothing urgent is blocking the day. Use the timeline below to move through today's lessons."
                : 'The school calendar changes the normal teaching flow today. Check any sessions that are still listed.',
            primaryLabel: "Open today's sessions",
            primaryHref: '/sessions/today',
            secondaryLabel: teachingLoad.length > 0 ? 'View teaching load' : 'Prepare lesson',
            secondaryHref: teachingLoad.length > 0 ? '/academic/cohorts' : '/lesson-plans/new',
            tone: 'success',
        };
    }

    if (!normalTeachingExpected) {
        return {
            key: 'calendar-clear-day',
            title: 'No normal teaching activity is expected',
            description: 'The school calendar affects normal lessons today. Keep an eye on unfinished records, but a standard lesson flow is not expected.',
            primaryLabel: "Open today's sessions",
            primaryHref: '/sessions/today',
            secondaryLabel: 'View teaching load',
            secondaryHref: '/academic/cohorts',
            tone: 'info',
        };
    }

    if (teachingLoad.length === 0) {
        return {
            key: 'teaching-load-not-assigned',
            title: 'Your teaching load is not assigned yet',
            description: 'Once classes or subjects are assigned to you, daily lessons and reminders will appear here.',
            primaryLabel: 'View teaching load',
            primaryHref: '/academic/cohorts',
            secondaryLabel: 'Submit request',
            secondaryHref: '/requests/new',
            tone: 'info',
        };
    }

    return {
        key: 'quiet-day',
        title: 'Nothing needs action right now',
        description: 'No lesson is scheduled today and no unfinished teaching record is waiting in this diary.',
        primaryLabel: 'View teaching load',
        primaryHref: '/academic/cohorts',
        secondaryLabel: 'Prepare lesson',
        secondaryHref: '/lesson-plans/new',
        tone: 'success',
    };
}

function isNormalTeachingExpected(learningDayState: LearningDayState): boolean {
    return learningDayState === 'NORMAL_TEACHING_DAY' || learningDayState === 'SCHOOL_EVENT' || learningDayState === 'CLOSING_PERIOD';
}

export function useTeachingToday(): UseTeachingTodayResult {
    const [clock, setClock] = useState(() => new Date());
    const [lastRefresh, setLastRefresh] = useState(() => new Date());

    const {
        data: setupStatus,
        isLoading: setupStatusLoading,
        error: setupStatusError,
        refetch: refetchSetupStatus,
    } = useAcademicSetupStatus();
    const {
        data: teachingLoadData,
        isLoading: teachingLoadLoading,
        error: teachingLoadError,
        refetch: refetchTeachingLoad,
    } = useMyTeachingLoad();
    const {
        currentYear,
        loading: currentYearLoading,
        error: currentYearError,
        refetch: refetchCurrentYear,
    } = useCurrentAcademicYear();
    const {
        currentTerm,
        loading: currentTermLoading,
        error: currentTermError,
        refetch: refetchCurrentTerm,
    } = useCurrentTerm();
    const {
        events: calendarEvents,
        loading: calendarLoading,
        error: calendarError,
        refetch: refetchCalendarEvents,
    } = useTermCalendarEvents(currentTerm?.id ?? null);
    const {
        sessions: todaySessions,
        loading: sessionsLoading,
        error: sessionsError,
        refetch: refetchTodaySessions,
    } = useTodaySessions();
    const {
        reminders,
        loading: remindersLoading,
        error: remindersError,
        refetch: refetchReminders,
    } = useSessionLifecycleReminders();
    const {
        summary: reviewSummary,
        loading: reviewSummaryLoading,
        error: reviewSummaryError,
        refetch: refetchReviewSummary,
    } = useAssessmentReviewSummary({
        term: currentTerm?.id,
        enabled: Boolean(currentTerm?.id),
    });
    const {
        scores,
        loading: scoresLoading,
        error: scoresError,
        refetch: refetchScores,
    } = useAssessmentScores({
        assessment__term: currentTerm?.id,
        page_size: 50,
        enabled: Boolean(currentTerm?.id),
    });

    const todayKey = useMemo(() => getDateKey(clock), [clock]);
    const teachingLoad = useMemo(
        () => teachingLoadData?.assignments ?? [],
        [teachingLoadData?.assignments]
    );
    const calendarEventsToday = useMemo(
        () => calendarEvents.filter((event) => isDateWithinRange(todayKey, event.start_date, event.end_date)),
        [calendarEvents, todayKey]
    );
    const currentWeek = useMemo(
        () => computeCurrentWeek(currentTerm, todayKey),
        [currentTerm, todayKey]
    );
    const learningDayState = useMemo(
        () => deriveLearningDayState(setupStatus ?? null, currentTerm, calendarEventsToday),
        [calendarEventsToday, currentTerm, setupStatus]
    );
    const normalTeachingExpected = useMemo(
        () => isNormalTeachingExpected(learningDayState),
        [learningDayState]
    );
    const timeline = useMemo(
        () => sortSessions(todaySessions),
        [todaySessions]
    );
    const sessionGroups = useMemo(
        () => buildSessionGroups(todaySessions),
        [todaySessions]
    );
    const incomplete = useMemo(
        () => buildIncompleteItems(reminders, todaySessions),
        [reminders, todaySessions]
    );
    const pendingReviewRows = useMemo<AssessmentScore[]>(() => (
        scores
            .filter((score) => (
                score.is_pending_review
                || (
                    score.score == null
                    && score.rubric_level == null
                    && score.status === AssessmentScoreStatus.PENDING_REVIEW
                )
            ))
            .sort((left, right) => (
                left.assessment_name.localeCompare(right.assessment_name)
                || left.student_name.localeCompare(right.student_name)
            ))
    ), [scores]);
    const pendingAssessmentReviewCount = reviewSummary?.pending_review_count ?? pendingReviewRows.length;
    const nextAction = useMemo(
        () => buildNextAction({
            groups: sessionGroups,
            timeline,
            incomplete,
            learningDayState,
            normalTeachingExpected,
            pendingAssessmentReviewCount,
            teachingLoad,
        }),
        [
            incomplete,
            learningDayState,
            normalTeachingExpected,
            pendingAssessmentReviewCount,
            sessionGroups,
            teachingLoad,
            timeline,
        ]
    );

    const refresh = useCallback(async () => {
        await Promise.all([
            refetchSetupStatus(),
            refetchCurrentYear(),
            refetchCurrentTerm(),
            refetchCalendarEvents(),
            refetchTodaySessions(),
            refetchReminders(),
            refetchReviewSummary(),
            refetchScores(),
            refetchTeachingLoad(),
        ]);
        const nextRefresh = new Date();
        setClock(nextRefresh);
        setLastRefresh(nextRefresh);
    }, [
        refetchCalendarEvents,
        refetchCurrentTerm,
        refetchCurrentYear,
        refetchReminders,
        refetchReviewSummary,
        refetchScores,
        refetchSetupStatus,
        refetchTeachingLoad,
        refetchTodaySessions,
    ]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            void refresh();
        }, AUTO_REFRESH_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [refresh]);

    const loading = Boolean(
        setupStatusLoading
        || currentYearLoading
        || currentTermLoading
        || calendarLoading
        || sessionsLoading
        || remindersLoading
        || reviewSummaryLoading
        || scoresLoading
        || teachingLoadLoading
    );
    const error = setupStatusError?.message
        ?? currentYearError
        ?? currentTermError
        ?? calendarError
        ?? sessionsError
        ?? remindersError
        ?? reviewSummaryError
        ?? scoresError
        ?? teachingLoadError?.message
        ?? null;

    return {
        context: {
            todayKey,
            currentYear,
            currentTerm,
            currentWeek,
            setupStatus: setupStatus ?? null,
            calendarEventsToday,
            calendarAffectsLearning: calendarEventsToday.some((event) => event.affects_learning),
            normalTeachingExpected,
            learningDayState,
            sessions: sessionGroups,
            timeline,
            incomplete,
            nextAction,
            afterTeaching: {
                pendingAssessmentReviewCount,
                pendingReviewRows,
            },
            teachingLoad,
        },
        loading,
        error,
        lastRefresh,
        refresh,
    };
}
