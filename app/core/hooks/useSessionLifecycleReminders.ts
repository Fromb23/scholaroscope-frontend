import { useCallback, useEffect, useMemo, useState } from 'react';
import { sessionAPI } from '@/app/core/api/sessions';
import { useCurrentAcademicYear } from '@/app/core/hooks/useAcademic';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useTodaySessions } from '@/app/core/hooks/useSessions';
import { emitSessionDataChanged } from '@/app/core/lib/sessionEvents';
import type { TeachingAssignment } from '@/app/core/types/academic';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';
import type {
    Session,
    SessionLifecycleReminder,
    SessionLifecycleReminderType,
} from '@/app/core/types/session';

const REMINDER_REFRESH_INTERVAL = 60_000;

function getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatFallbackStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return getDateKey(date);
}

function toIdSet(idsKey: string): Set<number> {
    if (!idsKey) return new Set<number>();

    return new Set(
        idsKey
            .split(',')
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value))
    );
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function firstFiniteNumber(...values: Array<number | null | undefined>): number | null {
    for (const value of values) {
        if (isFiniteNumber(value)) {
            return value;
        }
    }

    return null;
}

function normalizeTeachingSource(source?: string | null, curriculumType?: string | null) {
    if (curriculumType === 'CBE') {
        return 'cbc';
    }

    return source?.trim().toLowerCase() || 'kernel';
}

function getSessionScopedCohortSubjectId(session: Session): number | null {
    return firstFiniteNumber(session.cohort_subject, session.cambridge_cohort_subject_id);
}

function hasEquivalentSessionIdentity(session: Session) {
    return isFiniteNumber(session.offering_id) || isFiniteNumber(session.subject_id);
}

function matchesInstructorAssignmentBySessionIdentity(
    session: Session,
    assignment: TeachingAssignment
) {
    if (session.cohort_id !== assignment.cohort_id) {
        return false;
    }

    const sessionSource = normalizeTeachingSource(session.subject_source, session.curriculum_type);
    const assignmentSource = normalizeTeachingSource(
        assignment.source ?? assignment.subject_source,
        assignment.curriculum_type
    );

    if (sessionSource !== assignmentSource) {
        return false;
    }

    if (
        sessionSource === 'cambridge' &&
        isFiniteNumber(session.offering_id) &&
        isFiniteNumber(assignment.offering_id)
    ) {
        return session.offering_id === assignment.offering_id;
    }

    return isFiniteNumber(session.subject_id) && session.subject_id === assignment.subject_id;
}

function filterInstructorSessions(
    allSessions: Session[],
    assignments: TeachingAssignment[],
    allowedCohortSubjectIds: Set<number>,
    allowedCohortIds: Set<number>
) {
    return allSessions.filter((session) => {
        const scopedCohortSubjectId = getSessionScopedCohortSubjectId(session);

        if (scopedCohortSubjectId !== null) {
            if (allowedCohortSubjectIds.has(scopedCohortSubjectId)) {
                return true;
            }

            return hasEquivalentSessionIdentity(session)
                ? assignments.some((assignment) => matchesInstructorAssignmentBySessionIdentity(session, assignment))
                : false;
        }

        if (hasEquivalentSessionIdentity(session)) {
            return assignments.some((assignment) => matchesInstructorAssignmentBySessionIdentity(session, assignment));
        }

        return allowedCohortIds.has(session.cohort_id);
    });
}

function timeToMinutes(value: string | null): number | null {
    if (!value) return null;

    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null;
    }

    return hours * 60 + minutes;
}

function buildReminder(
    session: Session,
    todayKey: string,
    currentMinutes: number
): SessionLifecycleReminder | null {
    if (session.status !== 'IN_PROGRESS') {
        return null;
    }

    if (session.session_date === todayKey) {
        const endMinutes = timeToMinutes(session.end_time);
        const type: SessionLifecycleReminderType =
            endMinutes !== null && currentMinutes > endMinutes
                ? 'NEEDS_CLOSING'
                : 'OPEN_LESSON';

        return {
            session,
            type,
            label: type === 'NEEDS_CLOSING' ? 'Needs closing' : 'Open lesson',
            severity: type === 'NEEDS_CLOSING' ? 'warning' : 'info',
        };
    }

    if (session.session_date < todayKey) {
        return {
            session,
            type: 'UNFINISHED_LESSON',
            label: 'Unfinished lesson',
            severity: 'danger',
        };
    }

    return null;
}

const reminderPriority: Record<SessionLifecycleReminderType, number> = {
    NEEDS_CLOSING: 0,
    OPEN_LESSON: 1,
    UNFINISHED_LESSON: 2,
};

export function useSessionLifecycleReminders() {
    const [recentSessions, setRecentSessions] = useState<Session[]>([]);
    const [recentLoading, setRecentLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [clock, setClock] = useState(() => new Date());

    const { currentYear } = useCurrentAcademicYear();
    const instructorAccess = useInstructorCohortAccess();
    const { sessions: todaySessions, loading: todayLoading, error: todayError, refetch: refetchToday } = useTodaySessions();

    const allowedCohortIds = useMemo(
        () => toIdSet(instructorAccess.cohortIdsKey),
        [instructorAccess.cohortIdsKey]
    );
    const allowedCohortSubjectIds = useMemo(
        () => toIdSet(instructorAccess.cohortSubjectIdsKey),
        [instructorAccess.cohortSubjectIdsKey]
    );

    const todayKey = useMemo(() => getDateKey(clock), [clock]);
    const currentMinutes = useMemo(
        () => clock.getHours() * 60 + clock.getMinutes(),
        [clock]
    );
    const rangeStart = currentYear?.start_date ?? formatFallbackStartDate();

    const fetchRecentSessions = useCallback(async () => {
        try {
            setRecentLoading(true);
            const data = await sessionAPI.getByDateRange(rangeStart, todayKey);
            const filtered = instructorAccess.isInstructor
                ? filterInstructorSessions(
                    data,
                    instructorAccess.assignments,
                    allowedCohortSubjectIds,
                    allowedCohortIds
                )
                : data;

            setRecentSessions(filtered);
            setError(null);
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Could not load lesson reminders.'));
            setRecentSessions([]);
        } finally {
            setRecentLoading(false);
        }
    }, [
        allowedCohortIds,
        allowedCohortSubjectIds,
        instructorAccess.assignments,
        instructorAccess.isInstructor,
        rangeStart,
        todayKey,
    ]);

    useEffect(() => {
        void fetchRecentSessions();
    }, [fetchRecentSessions]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setClock(new Date());
            void refetchToday();
            void fetchRecentSessions();
        }, REMINDER_REFRESH_INTERVAL);

        return () => {
            window.clearInterval(interval);
        };
    }, [fetchRecentSessions, refetchToday]);

    const reminders = useMemo(() => {
        const previousSessions = recentSessions.filter((session) => session.session_date < todayKey);

        return [...todaySessions, ...previousSessions]
            .map((session) => buildReminder(session, todayKey, currentMinutes))
            .filter((reminder): reminder is SessionLifecycleReminder => reminder !== null)
            .sort((left, right) => {
                const priorityDiff = reminderPriority[left.type] - reminderPriority[right.type];
                if (priorityDiff !== 0) return priorityDiff;

                return new Date(right.session.created_at).getTime() - new Date(left.session.created_at).getTime();
            });
    }, [currentMinutes, recentSessions, todayKey, todaySessions]);

    const needsClosingCount = useMemo(
        () => reminders.filter((reminder) => reminder.type === 'NEEDS_CLOSING').length,
        [reminders]
    );

    const unfinishedCount = useMemo(
        () => reminders.filter((reminder) => reminder.type === 'UNFINISHED_LESSON').length,
        [reminders]
    );

    const refetch = useCallback(async () => {
        await Promise.all([refetchToday(), fetchRecentSessions()]);
    }, [fetchRecentSessions, refetchToday]);

    const completeSession = useCallback(async (sessionId: number) => {
        await sessionAPI.complete(sessionId);
        emitSessionDataChanged();
        await refetch();
    }, [refetch]);

    return {
        reminders,
        needsClosingCount,
        unfinishedCount,
        loading: todayLoading || recentLoading,
        error: error ?? todayError,
        refetch,
        completeSession,
    };
}
