// app/plugins/cbc/lib/queryKeys.ts
// All React Query cache keys for the CBC plugin.
// Import from here — never hardcode strings in hooks.

import type { CbcAssessmentReportResultFilters } from '@/app/plugins/cbc/types/cbc';

export const cbcKeys = {
    instructorContext: {
        detail: (userId: number, organizationId: number, curriculumId: number) =>
            ['cbc', 'instructor-context', userId, organizationId, curriculumId] as const,
    },

    catalog: {
        all: ['cbc', 'catalog'] as const,
        detail: ['cbc', 'catalog', 'detail'] as const,
    },

    // Structural
    strands: {
        all: ['cbc', 'strands'] as const,
        list: (params?: { curriculum?: number; subject?: number; subject_profile?: number }) =>
            ['cbc', 'strands', 'list', params] as const,
        detail: (id: number) => ['cbc', 'strands', id] as const,
        byCurriculum: (id: number) => ['cbc', 'strands', 'by-curriculum', id] as const,
        byProfiles: (curriculumId: number, profileIds: number[]) =>
            ['cbc', 'strands', 'by-profiles', curriculumId, profileIds] as const,
        detailByProfiles: (curriculumId: number, profileIds: number[]) =>
            ['cbc', 'strands', 'detail-by-profiles', curriculumId, profileIds] as const,
    },

    subStrands: {
        all: ['cbc', 'sub-strands'] as const,
        list: (strandId?: number) => ['cbc', 'sub-strands', 'list', strandId] as const,
        detail: (id: number) => ['cbc', 'sub-strands', id] as const,
    },

    outcomes: {
        all: ['cbc', 'outcomes'] as const,
        list: (params?: { sub_strand?: number; level?: string }) =>
            ['cbc', 'outcomes', 'list', params] as const,
        detail: (id: number) => ['cbc', 'outcomes', id] as const,
        byStrand: (strandId: number) => ['cbc', 'outcomes', 'by-strand', strandId] as const,
    },

    // Evidence
    evidence: {
        all: ['cbc', 'evidence'] as const,
        list: (params?: Record<string, unknown>) => ['cbc', 'evidence', 'list', params] as const,
        bySessionOutcome: (sessionId: number, learningOutcomeId: number) =>
            ['cbc', 'evidence', 'session-outcome', sessionId, learningOutcomeId] as const,
        studentProgress: (studentId: number) =>
            ['cbc', 'evidence', 'student-progress', studentId] as const,
        classProgress: (cohortId: number) =>
            ['cbc', 'evidence', 'class-progress', cohortId] as const,
        outcomeAchievement: (outcomeId: number) =>
            ['cbc', 'evidence', 'outcome-achievement', outcomeId] as const,
        studentConfidence: (studentId: number) =>
            ['cbc', 'evidence', 'confidence', studentId] as const,
    },

    // OutcomeSession
    outcomeSessions: {
        all: ['cbc', 'outcome-sessions'] as const,
        bySession: (sessionId: number) =>
            ['cbc', 'outcome-sessions', 'by-session', sessionId] as const,
    },

    // OutcomeProgress
    outcomeProgress: {
        all: ['cbc', 'outcome-progress'] as const,
        student: (studentId: number) =>
            ['cbc', 'outcome-progress', 'student', studentId] as const,
        studentSummary: (studentId: number) =>
            ['cbc', 'outcome-progress', 'student-summary', studentId] as const,
        cohortSummary: (cohortId: number) =>
            ['cbc', 'outcome-progress', 'cohort-summary', cohortId] as const,
        cbcSummary: (cohortId: number, subjectId: number) =>
            ['cbc', 'outcome-progress', 'cbc-summary', cohortId, subjectId] as const,
        distribution: (outcomeId: number, cohortId: number) =>
            ['cbc', 'outcome-progress', 'distribution', outcomeId, cohortId] as const,
        strandDistribution: (strandId: number, cohortId: number, subjectId?: number | null) =>
            ['cbc', 'outcome-progress', 'strand-distribution', strandId, cohortId, subjectId ?? null] as const,
        outcomeLearners: (outcomeId: number, cohortId: number, levels?: string) =>
            ['cbc', 'outcome-progress', 'learners', outcomeId, cohortId, levels] as const,
    },
    rubricScale: {
        forSession: (sessionId: number) =>
            ['cbc', 'rubricScale', 'session', sessionId] as const,
    },

    assessmentReportResults: {
        all: ['cbc', 'assessment-report-results'] as const,
        list: (filters?: CbcAssessmentReportResultFilters) =>
            ['cbc', 'assessment-report-results', 'list', filters] as const,
        detail: (id: number) => ['cbc', 'assessment-report-results', id] as const,
    },

    // Teaching sessions
    teachingSessions: {
        all: ['cbc', 'teaching-sessions'] as const,
        list: (params?: Record<string, unknown>) =>
            ['cbc', 'teaching-sessions', 'list', params] as const,
        today: ['cbc', 'teaching-sessions', 'today'] as const,
        recent: (days: number) => ['cbc', 'teaching-sessions', 'recent', days] as const,
        detail: (id: number) => ['cbc', 'teaching-sessions', id] as const,
        summary: (id: number) => ['cbc', 'teaching-sessions', 'summary', id] as const,
        learners: (id: number) => ['cbc', 'teaching-sessions', 'learners', id] as const,
        outcomes: (id: number) => ['cbc', 'teaching-sessions', 'outcomes', id] as const,
    },
} as const;
