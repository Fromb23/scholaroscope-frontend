import type { Term, TermCalendarEvent, TermCalendarEventType } from '@/app/core/types/academic';
import type { SchemeSubjectStrandOption, SchemeWeekType } from '@/app/core/types/schemes';

export interface FlattenedSubStrandOption {
    strandId: number;
    strandName: string;
    subStrandId: number;
    subStrandName: string;
    order: number;
}

export interface DerivedSchemeWeek {
    week_number: number;
    week_type: SchemeWeekType;
    affects_learning: boolean;
    label: string;
    notes: string;
    event_titles: string[];
    priority: number;
}

const TERM_CALENDAR_EVENT_PRIORITY: Record<TermCalendarEventType, number> = {
    HOLIDAY: 6,
    PUBLIC_HOLIDAY: 6,
    MIDTERM_BREAK: 5,
    EXIT_EXAM: 4,
    MAIN_EXAM: 4,
    MIDTERM_EXAM: 3,
    ENTRY_EXAM: 2,
    SCHOOL_EVENT: 1,
    OTHER: 1,
};

const TERM_CALENDAR_EVENT_TO_SCHEME_WEEK_TYPE: Record<TermCalendarEventType, SchemeWeekType> = {
    ENTRY_EXAM: 'ENTRY_EXAM',
    MIDTERM_EXAM: 'MIDTERM_EXAM',
    MIDTERM_BREAK: 'MIDTERM_BREAK',
    MAIN_EXAM: 'EXIT_EXAM',
    EXIT_EXAM: 'EXIT_EXAM',
    HOLIDAY: 'HOLIDAY',
    PUBLIC_HOLIDAY: 'HOLIDAY',
    SCHOOL_EVENT: 'OTHER',
    OTHER: 'OTHER',
};

export function calculateTermWeekCount(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 0;
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;

    if (totalDays <= 0) {
        return 0;
    }

    return Math.ceil(totalDays / 7);
}

export function formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return `${start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })} - ${end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })}`;
}

export function formatTimestamp(value: string): string {
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function getSchemeWeekTypeLabel(weekType: SchemeWeekType): string {
    switch (weekType) {
        case 'TEACHING':
            return 'Teaching';
        case 'MIDTERM_BREAK':
            return 'Midterm Break';
        case 'MIDTERM_EXAM':
            return 'Midterm Exams';
        case 'ENTRY_EXAM':
            return 'Entry Exams';
        case 'EXIT_EXAM':
            return 'End Term Exams';
        case 'HOLIDAY':
            return 'Holiday';
        case 'OTHER':
            return 'Other';
        default:
            return weekType;
    }
}

function uniqueStrings(values: string[]): string[] {
    return Array.from(
        new Set(
            values
                .map((value) => value.trim())
                .filter(Boolean)
        ),
    );
}

function resolveEventWeekNumber(termStartDate: string, date: string): number {
    const termStart = new Date(termStartDate);
    const current = new Date(date);

    if (Number.isNaN(termStart.getTime()) || Number.isNaN(current.getTime())) {
        return 1;
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const elapsedDays = Math.floor((current.getTime() - termStart.getTime()) / millisecondsPerDay);
    return Math.max(Math.floor(elapsedDays / 7) + 1, 1);
}

function eventPriority(eventType: TermCalendarEventType): number {
    return TERM_CALENDAR_EVENT_PRIORITY[eventType] ?? 0;
}

export function buildSchemeWeeksFromTermCalendar(
    term: Pick<Term, 'start_date' | 'end_date' | 'week_count'>,
    events: TermCalendarEvent[],
): DerivedSchemeWeek[] {
    const weekCount = term.week_count || calculateTermWeekCount(term.start_date, term.end_date);
    const weeks: DerivedSchemeWeek[] = Array.from({ length: weekCount }, (_, index) => ({
        week_number: index + 1,
        week_type: 'TEACHING',
        affects_learning: false,
        label: 'Teaching',
        notes: '',
        event_titles: [],
        priority: 0,
    }));

    for (const event of events) {
        const startWeek = event.start_week_number ?? resolveEventWeekNumber(term.start_date, event.start_date);
        const endWeek = event.end_week_number ?? resolveEventWeekNumber(term.start_date, event.end_date);
        const normalizedStart = Math.max(Math.min(startWeek, endWeek), 1);
        const normalizedEnd = Math.min(Math.max(startWeek, endWeek), weekCount);
        const mappedWeekType = TERM_CALENDAR_EVENT_TO_SCHEME_WEEK_TYPE[event.event_type];
        const nextPriority = eventPriority(event.event_type);

        for (let weekNumber = normalizedStart; weekNumber <= normalizedEnd; weekNumber += 1) {
            const week = weeks[weekNumber - 1];

            week.affects_learning = week.affects_learning || event.affects_learning;
            week.event_titles = uniqueStrings([...week.event_titles, event.title]);
            week.notes = uniqueStrings([week.notes, event.notes]).join('\n');

            if (nextPriority >= week.priority) {
                week.week_type = mappedWeekType;
                week.priority = nextPriority;
            }
        }
    }

    return weeks.map((week) => ({
        ...week,
        label: week.event_titles.length > 0 ? week.event_titles.join(' / ') : getSchemeWeekTypeLabel(week.week_type),
    }));
}

export function parseWeekInput(
    rawValue: string,
    maxWeekCount: number,
): { weeks: number[]; error: string | null } {
    const trimmed = rawValue.trim();
    if (!trimmed) {
        return { weeks: [], error: null };
    }

    const weeks = new Set<number>();

    for (const part of trimmed.split(',')) {
        const token = part.trim();
        if (!token) {
            continue;
        }

        if (token.includes('-')) {
            const [startRaw, endRaw] = token.split('-', 2).map((value) => value.trim());
            const start = Number(startRaw);
            const end = Number(endRaw);

            if (!Number.isInteger(start) || !Number.isInteger(end)) {
                return {
                    weeks: [],
                    error: `Week range "${token}" is not valid.`,
                };
            }

            if (start > end) {
                return {
                    weeks: [],
                    error: `Week range "${token}" must go from lower to higher.`,
                };
            }

            for (let value = start; value <= end; value += 1) {
                if (value < 1 || value > maxWeekCount) {
                    return {
                        weeks: [],
                        error: `Week ${value} is outside the selected term.`,
                    };
                }
                weeks.add(value);
            }
            continue;
        }

        const weekNumber = Number(token);
        if (!Number.isInteger(weekNumber)) {
            return {
                weeks: [],
                error: `Week value "${token}" is not valid.`,
            };
        }

        if (weekNumber < 1 || weekNumber > maxWeekCount) {
            return {
                weeks: [],
                error: `Week ${weekNumber} is outside the selected term.`,
            };
        }

        weeks.add(weekNumber);
    }

    return {
        weeks: Array.from(weeks).sort((left, right) => left - right),
        error: null,
    };
}

export function summarizeSchemeWeeks(
    weeks: Array<Pick<DerivedSchemeWeek, 'week_type' | 'affects_learning'>>,
): {
    nonTeachingWeekCount: number;
    activeLearningWeekCount: number;
} {
    const nonTeachingWeekCount = weeks.filter((week) => week.affects_learning).length;

    return {
        nonTeachingWeekCount,
        activeLearningWeekCount: Math.max(weeks.length - nonTeachingWeekCount, 0),
    };
}

export function flattenSubjectStrands(
    strands: SchemeSubjectStrandOption[],
): FlattenedSubStrandOption[] {
    let order = 0;

    return strands.flatMap((strand) => (
        strand.sub_strands.map((subStrand) => {
            order += 1;

            return {
                strandId: strand.id,
                strandName: strand.name,
                subStrandId: subStrand.id,
                subStrandName: subStrand.name,
                order,
            };
        })
    ));
}
