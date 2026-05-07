export const academicKeys = {
    curricula: {
        all: ['academic', 'curricula'] as const,
        list: (organizationId: number | null) =>
            ['academic', 'curricula', 'list', organizationId] as const,
    },
    subjects: {
        all: ['academic', 'subjects'] as const,
        list: (organizationId: number | null, curriculumId: number | null = null) =>
            ['academic', 'subjects', 'list', organizationId, curriculumId] as const,
        detail: (subjectId: number | null) =>
            ['academic', 'subjects', 'detail', subjectId] as const,
    },
    cohorts: {
        all: ['academic', 'cohorts'] as const,
        list: (organizationId: number | null, filtersKey: string) =>
            ['academic', 'cohorts', 'list', organizationId, filtersKey] as const,
        detail: (cohortId: number | null) =>
            ['academic', 'cohorts', 'detail', cohortId] as const,
    },
    cohortSubjects: {
        all: ['academic', 'cohort-subjects'] as const,
        list: (organizationId: number | null, paramsKey: string) =>
            ['academic', 'cohort-subjects', 'list', organizationId, paramsKey] as const,
    },
} as const;
