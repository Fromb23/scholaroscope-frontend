import type {
    LearningDayState,
    TeachingTodayActionTone,
    TeachingTodayIncompleteGroup,
} from '@/app/core/hooks/useTeachingToday';
import type { Session } from '@/app/core/types/session';
import type { TermCalendarEventType } from '@/app/core/types/academic';

type BadgeVariant =
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'default'
    | 'blue'
    | 'green'
    | 'yellow'
    | 'red'
    | 'maroon'
    | 'purple'
    | 'indigo'
    | 'orange';

export const learningDayLabels: Record<LearningDayState, string> = {
    SETUP_BLOCKED: 'Setup not ready',
    NO_ACTIVE_TERM: 'No active term',
    NORMAL_TEACHING_DAY: 'Teaching day',
    EXAM_DAY: 'Exam day',
    MIDTERM_BREAK: 'Midterm break',
    HOLIDAY: 'Holiday',
    PUBLIC_HOLIDAY: 'Public holiday',
    SCHOOL_EVENT: 'School event',
    CLOSING_PERIOD: 'Closing period',
};

export const learningDayBadgeVariants: Record<LearningDayState, BadgeVariant> = {
    SETUP_BLOCKED: 'warning',
    NO_ACTIVE_TERM: 'warning',
    NORMAL_TEACHING_DAY: 'green',
    EXAM_DAY: 'purple',
    MIDTERM_BREAK: 'blue',
    HOLIDAY: 'blue',
    PUBLIC_HOLIDAY: 'blue',
    SCHOOL_EVENT: 'orange',
    CLOSING_PERIOD: 'orange',
};

export const eventTypeLabels: Record<TermCalendarEventType, string> = {
    ENTRY_EXAM: 'Entry exam',
    MIDTERM_EXAM: 'Midterm exam',
    MIDTERM_BREAK: 'Midterm break',
    MAIN_EXAM: 'Main exam',
    EXIT_EXAM: 'Exit exam',
    HOLIDAY: 'Holiday',
    PUBLIC_HOLIDAY: 'Public holiday',
    SCHOOL_EVENT: 'School event',
    OTHER: 'Calendar event',
};

export const incompleteGroupLabels: Record<TeachingTodayIncompleteGroup, string> = {
    STILL_OPEN: 'Still open',
    NEEDS_COMPLETION: 'Needs completion',
    FORGOTTEN_PREVIOUS_DAY: 'Forgotten from previous day',
    NEEDS_ATTENTION_BEFORE_END: 'Needs attention before today ends',
};

export const actionToneClasses: Record<TeachingTodayActionTone, {
    surface: string;
    border: string;
    icon: string;
    badge: BadgeVariant;
}> = {
    info: {
        surface: 'theme-info-surface',
        border: 'border-blue-200',
        icon: 'text-[color:var(--color-primary)]',
        badge: 'blue',
    },
    success: {
        surface: 'theme-success-surface',
        border: 'border-green-200',
        icon: 'text-[color:var(--color-success)]',
        badge: 'green',
    },
    warning: {
        surface: 'theme-warning-surface',
        border: 'border-yellow-200',
        icon: 'text-[color:var(--color-warning)]',
        badge: 'orange',
    },
    danger: {
        surface: 'theme-danger-surface',
        border: 'border-red-200',
        icon: 'text-[color:var(--color-danger)]',
        badge: 'red',
    },
};

export function formatDateKey(value: string): string {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

export function formatShortDateKey(value: string): string {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

export function formatTime(value: string | null): string {
    if (!value) return 'TBA';

    const parsed = new Date(`1970-01-01T${value}`);
    if (Number.isNaN(parsed.getTime())) {
        return value.slice(0, 5);
    }

    return parsed.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function formatSessionTimeRange(session: Session): string {
    return `${formatTime(session.start_time)} - ${formatTime(session.end_time)}`;
}

export function getLessonPlanLabel(session: Session): string {
    if (!session.lesson_plan_id) {
        return 'No lesson plan';
    }

    const status = session.lesson_plan_status?.trim();
    if (!status) {
        return 'Lesson plan linked';
    }

    if (status === 'DRAFT' || status === 'GENERATED') {
        return `${status.toLowerCase()} plan needs review`;
    }

    return `${status.toLowerCase()} plan`;
}

export function getSessionActionLabel(session: Session): string {
    if (session.schedule_state === 'IN_PROGRESS_OVERDUE' || session.needs_completion) {
        return 'End lesson';
    }

    if (session.status === 'IN_PROGRESS') {
        return 'Continue lesson';
    }

    if (session.schedule_state === 'SCHEDULED_READY' || session.can_start_now) {
        return 'Start lesson';
    }

    if (session.schedule_state === 'SCHEDULED_OVERDUE') {
        return 'Open lesson';
    }

    if (session.schedule_state === 'SCHEDULED_LOCKED') {
        return session.start_available_time
            ? `Opens ${formatTime(session.start_available_time)}`
            : 'Scheduled';
    }

    if (session.status === 'COMPLETED' || session.schedule_state === 'COMPLETED') {
        return 'Completed';
    }

    return 'Open lesson';
}

export function getSessionStatusVariant(session: Session): BadgeVariant {
    if (session.schedule_state === 'IN_PROGRESS_OVERDUE' || session.needs_completion) {
        return 'red';
    }

    if (session.status === 'IN_PROGRESS') {
        return 'orange';
    }

    if (session.schedule_state === 'SCHEDULED_READY' || session.can_start_now) {
        return 'green';
    }

    if (session.schedule_state === 'SCHEDULED_OVERDUE') {
        return 'warning';
    }

    if (session.status === 'COMPLETED' || session.schedule_state === 'COMPLETED') {
        return 'default';
    }

    return 'blue';
}
