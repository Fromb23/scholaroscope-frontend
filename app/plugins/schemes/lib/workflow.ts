import type { Term, TermCalendarEvent, TermCalendarEventType } from '@/app/core/types/academic';
import type { SchemeSubjectStrandOption, SchemeWeekType } from '@/app/core/types/schemes';
import { parseAppDestination } from '@/app/core/auth/navigation';

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

export type CreateSchemeStep = 1 | 2 | 3 | 4;

export type SchemeTermCalendarStateKind = 'INCOMPLETE' | 'READY' | 'HISTORICAL';

export interface SchemeTermCalendarState {
    state: SchemeTermCalendarStateKind;
    canManage: boolean;
    showConfigurationAction: boolean;
    actionLabel: string;
    title: string;
    message: string;
}

export type CreateSchemeValidationTarget =
    | 'curriculum'
    | 'subject'
    | 'level'
    | 'cohort-subject'
    | 'term-status'
    | 'title'
    | 'term-calendar'
    | 'lessons-per-week'
    | 'weekly-load-confirmation'
    | 'lesson-duration'
    | 'strand-range-status'
    | 'start-strand'
    | 'start-substrand'
    | 'end-strand'
    | 'end-substrand'
    | 'generation-status';

export interface CreateSchemeValidationFailure {
    valid: false;
    step: CreateSchemeStep;
    message: string;
    target: CreateSchemeValidationTarget;
}

export interface CreateSchemeValidationSuccess {
    valid: true;
}

export type CreateSchemeValidationResult =
    | CreateSchemeValidationFailure
    | CreateSchemeValidationSuccess;

export interface CreateSchemeStepValidationInput {
    step: CreateSchemeStep;
    hasSelectedCurriculum: boolean;
    hasSelectedSubject: boolean;
    hasSelectedLevel: boolean;
    hasSelectedCohortSubject: boolean;
    hasSelectedTerm: boolean;
    hasTitle: boolean;
    noActiveTermMessage?: string | null;
    termCalendarIsComplete: boolean;
    termCalendarSetupMessage?: string | null;
    activeLearningWeekCount: number;
    lessonsPerWeekValue: number | null;
    weeklyTeachingLoadConfirmed: boolean;
    lessonDurationMinutesValue: number | null;
    strandsError?: string | null;
    flattenedSubStrandCount: number;
    rangeError?: string | null;
    hasStartStrand: boolean;
    hasStartSubStrand: boolean;
    hasEndStrand: boolean;
    hasEndSubStrand: boolean;
    hasCurriculumRange: boolean;
}

export interface DefaultSchemeTitleInput {
    subjectName?: string | null;
    levelLabel?: string | null;
    termName?: string | null;
    academicYearName?: string | null;
}

export function resolveSchemeTermCalendarState(params: {
    selectedTerm: Pick<Term, 'configuration_state'>;
    canManageCalendar: boolean;
    selfManagedTeachingAdmin: boolean;
    setupMessage: string | null;
}): SchemeTermCalendarState {
    const { selectedTerm, canManageCalendar, selfManagedTeachingAdmin, setupMessage } = params;

    if (selectedTerm.configuration_state === 'HISTORICAL_LOCKED') {
        return {
            state: 'HISTORICAL',
            canManage: canManageCalendar,
            showConfigurationAction: false,
            actionLabel: selfManagedTeachingAdmin ? 'Review term calendar' : 'Edit term calendar',
            title: 'Term calendar is historical',
            message: "This term's calendar is locked and cannot be changed.",
        };
    }

    if (selectedTerm.configuration_state === 'SETUP_LOCKED') {
        return {
            state: 'READY',
            canManage: canManageCalendar,
            showConfigurationAction: false,
            actionLabel: selfManagedTeachingAdmin ? 'Review term calendar' : 'Edit term calendar',
            title: 'Term calendar ready',
            message:
                'The calendar is complete and will be used to calculate teaching weeks, exams, breaks, and holidays for this scheme.',
        };
    }

    return {
        state: 'INCOMPLETE',
        canManage: canManageCalendar,
        showConfigurationAction: canManageCalendar,
        actionLabel: selfManagedTeachingAdmin ? 'Review term calendar' : 'Edit term calendar',
        title: 'Term calendar setup incomplete',
        message: setupMessage || 'Complete or review your term calendar before generating this scheme.',
    };
}

export function buildSchemeTermCalendarSetupHref(params: {
    currentSchemeHref: string;
    selectedTermId?: number | null;
}): string {
    const safeReturnTo = parseAppDestination(params.currentSchemeHref) ?? '/schemes/new';
    const query = new URLSearchParams();

    if (params.selectedTermId) {
        query.set('term', String(params.selectedTermId));
    }
    query.set('returnTo', safeReturnTo);

    return `/academic/terms?${query.toString()}`;
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

function validationFailure(
    step: CreateSchemeStep,
    target: CreateSchemeValidationTarget,
    message: string,
): CreateSchemeValidationFailure {
    return {
        valid: false,
        step,
        target,
        message,
    };
}

export function buildDefaultSchemeTitle({
    subjectName,
    levelLabel,
    termName,
    academicYearName,
}: DefaultSchemeTitleInput): string {
    const level = levelLabel?.trim();
    const subject = subjectName?.trim();
    const term = termName?.trim();
    const academicYear = academicYearName?.trim();

    if (!level || !subject || !term) {
        return '';
    }

    return [level, subject, academicYear, term, 'Scheme of Work']
        .filter(Boolean)
        .join(' ');
}

export function validateCreateSchemeStep(input: CreateSchemeStepValidationInput): CreateSchemeValidationResult {
    if (input.step === 1) {
        if (!input.hasSelectedCurriculum) {
            return validationFailure(1, 'curriculum', 'Choose the curriculum.');
        }
        if (!input.hasSelectedSubject) {
            return validationFailure(1, 'subject', 'Choose the subject.');
        }
        if (!input.hasSelectedLevel) {
            return validationFailure(1, 'level', 'Choose the level or grade.');
        }
        if (!input.hasSelectedCohortSubject) {
            return validationFailure(1, 'cohort-subject', 'Choose the class / subject.');
        }
        if (!input.hasSelectedTerm) {
            return validationFailure(
                1,
                'term-status',
                input.noActiveTermMessage || 'There is no active teaching term for this class subject.',
            );
        }
        if (!input.hasTitle) {
            return validationFailure(1, 'title', 'Enter a scheme title.');
        }
        return { valid: true };
    }

    if (input.step === 2) {
        if (!input.hasSelectedTerm) {
            return validationFailure(
                2,
                'term-status',
                input.noActiveTermMessage || 'There is no active teaching term for this class subject.',
            );
        }
        if (!input.termCalendarIsComplete) {
            return validationFailure(
                2,
                'term-calendar',
                input.termCalendarSetupMessage || 'Complete the term calendar before generating schemes of work.',
            );
        }
        if (input.activeLearningWeekCount <= 0) {
            return validationFailure(2, 'term-calendar', 'There must be at least one active learning week.');
        }
        if (
            input.lessonsPerWeekValue === null ||
            input.lessonsPerWeekValue < 1 ||
            input.lessonsPerWeekValue > 10
        ) {
            return validationFailure(2, 'lessons-per-week', 'Lessons per week must be between 1 and 10.');
        }
        if (!input.weeklyTeachingLoadConfirmed) {
            return validationFailure(
                2,
                'weekly-load-confirmation',
                'Confirm the weekly teaching periods for this subject before continuing.',
            );
        }
        if (
            input.lessonDurationMinutesValue === null ||
            input.lessonDurationMinutesValue < 20 ||
            input.lessonDurationMinutesValue > 120
        ) {
            return validationFailure(2, 'lesson-duration', 'Lesson duration must be between 20 and 120 minutes.');
        }
        return { valid: true };
    }

    if (input.step === 3) {
        if (input.strandsError) {
            return validationFailure(3, 'strand-range-status', input.strandsError);
        }
        if (input.flattenedSubStrandCount === 0) {
            return validationFailure(
                3,
                'strand-range-status',
                "No strand range is registered for this class subject yet. Register the subject's sub-strands in curriculum setup before generating a scheme.",
            );
        }
        if (!input.hasStartStrand) {
            return validationFailure(3, 'start-strand', 'Choose the first strand to cover.');
        }
        if (!input.hasStartSubStrand) {
            return validationFailure(3, 'start-substrand', 'Choose the first sub-strand to cover.');
        }
        if (!input.hasEndStrand) {
            return validationFailure(3, 'end-strand', 'Choose the last strand to cover.');
        }
        if (!input.hasEndSubStrand) {
            return validationFailure(3, 'end-substrand', 'Choose the last sub-strand to cover.');
        }
        if (input.rangeError) {
            return validationFailure(3, 'start-strand', input.rangeError);
        }
        if (!input.hasCurriculumRange) {
            return validationFailure(3, 'start-strand', 'Complete the strand range before continuing.');
        }
        return { valid: true };
    }

    return { valid: true };
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
