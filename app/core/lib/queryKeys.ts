export const academicKeys = {
    curricula: {
        all: ['academic', 'curricula'] as const,
        list: (organizationId: number | null) =>
            ['academic', 'curricula', 'list', organizationId] as const,
    },
    cohorts: {
        all: ['academic', 'cohorts'] as const,
        detail: (cohortId: number | null) =>
            ['academic', 'cohorts', 'detail', cohortId] as const,
        subjects: (cohortId: number | null) =>
            ['academic', 'cohorts', 'subjects', cohortId] as const,
        enrolledStudents: (cohortId: number | null) =>
            ['academic', 'cohorts', 'students', 'enrolled', cohortId] as const,
        availableStudents: (cohortId: number | null) =>
            ['academic', 'cohorts', 'students', 'available', cohortId] as const,
        subjectParticipationPrefix: (cohortId: number | null) =>
            ['academic', 'cohorts', 'subject-participation', cohortId] as const,
        subjectParticipation: (cohortId: number | null, subjectIdsKey: string) =>
            ['academic', 'cohorts', 'subject-participation', cohortId, subjectIdsKey] as const,
    },
    cohortSubjects: {
        all: ['academic', 'cohort-subjects'] as const,
        learnersPrefix: ['academic', 'cohort-subjects', 'learners'] as const,
        learners: (cohortSubjectId: number | null) =>
            ['academic', 'cohort-subjects', 'learners', cohortSubjectId] as const,
        instructorHistory: (cohortSubjectId: number | null) =>
            ['academic', 'cohort-subjects', 'instructor-history', cohortSubjectId] as const,
    },
    students: {
        all: ['academic', 'students'] as const,
        detail: (studentId: number | null) =>
            ['academic', 'students', 'detail', studentId] as const,
    },
} as const;
