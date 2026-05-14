import type { InstructorAcademicYearFilterMode } from '@/app/core/hooks/useInstructorMyCohorts';

export function parseOptionalNumber(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

export function buildAcademicYearOptions(
    academicYears: Array<{ id: number; name: string; is_current: boolean }>,
    emptyLabel = 'All Academic Years'
) {
    return [
        { value: '', label: emptyLabel },
        ...academicYears.map((academicYear) => ({
            value: String(academicYear.id),
            label: academicYear.is_current
                ? `${academicYear.name} (Current)`
                : `${academicYear.name} — Historical`,
        })),
    ];
}

export function getInstructorAcademicYearFilterNotice(
    academicYearFilterMode: InstructorAcademicYearFilterMode
): string | null {
    if (academicYearFilterMode === 'id') {
        return null;
    }

    if (academicYearFilterMode === 'name') {
        return 'Academic year filtering is matched by year name because /users/my_teaching_load/ does not currently expose academic_year_id in cohort_assignments.';
    }

    return 'Academic year filtering is unavailable because /users/my_teaching_load/ does not currently expose academic year metadata in cohort_assignments.';
}
