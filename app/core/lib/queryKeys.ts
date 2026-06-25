export const academicKeys = {
    setupStatus: {
        detail: (organizationId: number | null) =>
            ['academic', 'setup-status', organizationId] as const,
    },
    todayMode: {
        detail: (organizationId: number | null) =>
            ['academic', 'today-mode', organizationId] as const,
    },
    curricula: {
        all: ['academic', 'curricula'] as const,
        list: (organizationId: number | null) =>
            ['academic', 'curricula', 'list', organizationId] as const,
        detail: (curriculumId: number | null) =>
            ['academic', 'curricula', 'detail', curriculumId] as const,
        disableImpact: (curriculumId: number | null) =>
            ['academic', 'curricula', 'disable-impact', curriculumId] as const,
    },
    curriculumDisableRequests: {
        all: ['academic', 'curriculum-disable-requests'] as const,
        list: (filters: Record<string, unknown>) =>
            ['academic', 'curriculum-disable-requests', 'list', filters] as const,
        detail: (requestId: number | null) =>
            ['academic', 'curriculum-disable-requests', 'detail', requestId] as const,
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
        subjectParticipation: (cohortId: number | null, subjectIdsKey: string, includeInstructor = true) =>
            ['academic', 'cohorts', 'subject-participation', cohortId, subjectIdsKey, includeInstructor] as const,
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

export const assignmentKeys = {
    all: ['assignments'] as const,
    lists: () => ['assignments', 'list'] as const,
    list: (filters: Record<string, unknown>) =>
        ['assignments', 'list', filters] as const,
    detail: (assignmentId: number | null) =>
        ['assignments', 'detail', assignmentId] as const,
    lifecycleState: (assignmentId: number | null) =>
        ['assignments', 'lifecycle-state', assignmentId] as const,
    preparedForLessonPlan: (lessonPlanId: number | null) =>
        ['assignments', 'prepared-for-lesson-plan', lessonPlanId] as const,
    eligibleLearnersPrefix: (assignmentId: number | null) =>
        ['assignments', assignmentId, 'eligible-learners'] as const,
    eligibleLearners: (
        assignmentId: number | null,
        source?: string,
        excludeGrouped?: boolean
    ) => ['assignments', assignmentId, 'eligible-learners', source ?? 'all', excludeGrouped] as const,
    recipients: (assignmentId: number | null) =>
        ['assignments', 'recipients', assignmentId] as const,
    evaluationsPrefix: (assignmentId: number | null) =>
        ['assignments', 'evaluations', assignmentId] as const,
    submissions: (assignmentId: number | null) =>
        ['assignments', 'submissions', assignmentId] as const,
    evaluations: (assignmentId: number | null, filters?: Record<string, unknown>) =>
        ['assignments', 'evaluations', assignmentId, filters ?? {}] as const,
    evaluationDetail: (evaluationId: number | null) =>
        ['assignments', 'evaluation-detail', evaluationId] as const,
    groups: (assignmentId: number | null) =>
        ['assignments', 'groups', assignmentId] as const,
    groupReuseSources: (assignmentId: number | null) =>
        ['assignments', 'group-reuse-sources', assignmentId] as const,
    groupDetail: (groupId: number | null) =>
        ['assignments', 'group-detail', groupId] as const,
    groupSubmissions: (groupId: number | null) =>
        ['assignments', 'group-submissions', groupId] as const,
    groupEvaluationsPrefix: (assignmentId: number | null) =>
        ['assignments', 'group-evaluations', assignmentId] as const,
    groupEvaluations: (assignmentId: number | null, filters?: Record<string, unknown>) =>
        ['assignments', 'group-evaluations', assignmentId, filters ?? {}] as const,
    groupEvaluationDetail: (evaluationId: number | null) =>
        ['assignments', 'group-evaluation-detail', evaluationId] as const,
} as const;
