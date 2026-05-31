import type {
    ExceptionalWeekInput,
    SchemeSubjectStrandOption,
    SchemeWeekType,
} from '@/app/core/types/schemes';

export interface FlattenedSubStrandOption {
    strandId: number;
    strandName: string;
    subStrandId: number;
    subStrandName: string;
    order: number;
}

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

export function summarizeLearningWeeks(
    termWeekCount: number,
    exceptionalWeeks: ExceptionalWeekInput[],
): {
    nonTeachingWeekCount: number;
    activeLearningWeekCount: number;
} {
    const nonTeachingWeekCount = exceptionalWeeks.filter((week) => week.affects_learning).length;

    return {
        nonTeachingWeekCount,
        activeLearningWeekCount: Math.max(termWeekCount - nonTeachingWeekCount, 0),
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
