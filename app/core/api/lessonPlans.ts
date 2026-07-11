import { apiClient } from '@/app/core/api/client';
import {
    getDownloadFileName,
    normalizeBlobError,
} from '@/app/core/api/downloads';
import { withClientMutationId } from '@/app/core/lib/clientMutationId';
import { withOperationalScope } from '@/app/core/lib/academicScope';
import type { PaginatedResponse } from '@/app/core/types/api';
import type {
    PrepareAssignmentFromLessonPlanPayload,
    PrepareAssignmentFromLessonPlanResponse,
    PreparedAssignmentsForLessonPlanResponse,
} from '@/app/core/types/assignments';
import type { LessonPlanCurriculumContext } from '@/app/core/types/lessonPlanCurriculum';
import type {
    AvailableLessonPlanParticipatingCohortsResponse,
    GenerateLessonPlanFromSessionPayload,
    GenerateLessonPlanPayload,
    GenerateLessonPlanResponse,
    LessonPlan,
    LessonPlanCreatePayload,
    LessonPlanQueryParams,
    LessonPlanUpdatePayload,
    MarkUsedPayload,
    ScheduleLessonPayload,
    ScheduleLessonResponse,
} from '@/app/core/types/lessonPlans';

export const LESSON_PLANS_BASE_PATH = '/lesson-plans';

export const lessonPlanAPI = {
    getAll: async (params?: LessonPlanQueryParams): Promise<LessonPlan[] | PaginatedResponse<LessonPlan>> => {
        const response = await apiClient.get<LessonPlan[] | PaginatedResponse<LessonPlan>>(
            `${LESSON_PLANS_BASE_PATH}/`,
            { params: withOperationalScope(params) }
        );
        return response.data;
    },

    getById: async (id: number): Promise<LessonPlan> => {
        const response = await apiClient.get<LessonPlan>(`${LESSON_PLANS_BASE_PATH}/${id}/`);
        return response.data;
    },

    exportPdf: async (id: number): Promise<{ blob: Blob; fileName: string }> => {
        try {
            const response = await apiClient.get<Blob>(
                `${LESSON_PLANS_BASE_PATH}/${id}/export_pdf/`,
                {
                    responseType: 'blob',
                }
            );
            const fileName = getDownloadFileName(
                response.headers['content-disposition'],
                `lesson-plan-${id}.pdf`
            );
            return {
                blob: response.data,
                fileName,
            };
        } catch (error) {
            return normalizeBlobError(error);
        }
    },

    create: async (payload: LessonPlanCreatePayload): Promise<LessonPlan> => {
        const response = await apiClient.post<LessonPlan>(`${LESSON_PLANS_BASE_PATH}/`, payload);
        return response.data;
    },

    getCurriculumContext: async (
        cohortSubjectId: number,
        termId?: number | null,
    ): Promise<LessonPlanCurriculumContext> => {
        const response = await apiClient.get<LessonPlanCurriculumContext>(
            `${LESSON_PLANS_BASE_PATH}/curriculum-context/`,
            {
                params: {
                    cohort_subject: cohortSubjectId,
                    ...(typeof termId === 'number' ? { term: termId } : {}),
                },
            }
        );
        return response.data;
    },

    update: async (id: number, payload: LessonPlanUpdatePayload): Promise<LessonPlan> => {
        const response = await apiClient.patch<LessonPlan>(`${LESSON_PLANS_BASE_PATH}/${id}/`, payload);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`${LESSON_PLANS_BASE_PATH}/${id}/`);
    },

    generate: async (
        id: number,
        payload: GenerateLessonPlanPayload,
    ): Promise<GenerateLessonPlanResponse> => {
        const response = await apiClient.post<GenerateLessonPlanResponse>(
            `${LESSON_PLANS_BASE_PATH}/${id}/generate/`,
            payload
        );
        return response.data;
    },

    generateFromSession: async (
        payload: GenerateLessonPlanFromSessionPayload,
    ): Promise<GenerateLessonPlanResponse> => {
        const response = await apiClient.post<GenerateLessonPlanResponse>(
            `${LESSON_PLANS_BASE_PATH}/generate/`,
            payload
        );
        return response.data;
    },

    schedule: async (
        id: number,
        payload: ScheduleLessonPayload,
    ): Promise<ScheduleLessonResponse> => {
        const response = await apiClient.post<ScheduleLessonResponse>(
            `${LESSON_PLANS_BASE_PATH}/${id}/schedule/`,
            payload
        );
        return response.data;
    },

    getAvailableParticipatingCohortSubjects: async (
        id: number,
    ): Promise<AvailableLessonPlanParticipatingCohortsResponse> => {
        const response = await apiClient.get<AvailableLessonPlanParticipatingCohortsResponse>(
            `${LESSON_PLANS_BASE_PATH}/${id}/available-participating-cohort-subjects/`
        );
        return response.data;
    },

    markReviewed: async (id: number): Promise<LessonPlan> => {
        const response = await apiClient.post<LessonPlan>(`${LESSON_PLANS_BASE_PATH}/${id}/mark_reviewed/`);
        return response.data;
    },

    markUsed: async (id: number, payload: MarkUsedPayload): Promise<LessonPlan> => {
        const response = await apiClient.post<LessonPlan>(`${LESSON_PLANS_BASE_PATH}/${id}/mark_used/`, payload);
        return response.data;
    },

    archive: async (id: number): Promise<LessonPlan> => {
        const response = await apiClient.post<LessonPlan>(`${LESSON_PLANS_BASE_PATH}/${id}/archive/`);
        return response.data;
    },

    restore: async (id: number): Promise<LessonPlan> => {
        const response = await apiClient.post<LessonPlan>(`${LESSON_PLANS_BASE_PATH}/${id}/restore/`);
        return response.data;
    },

    createAssignmentDraft: async (id: number): Promise<PrepareAssignmentFromLessonPlanResponse> => {
        const response = await apiClient.post<PrepareAssignmentFromLessonPlanResponse>(
            `${LESSON_PLANS_BASE_PATH}/${id}/create_assignment_draft/`,
            withClientMutationId({}, 'lesson-plan-assignment-draft')
        );
        return response.data;
    },

    prepareAssignment: async (
        id: number,
        payload: PrepareAssignmentFromLessonPlanPayload,
    ): Promise<PrepareAssignmentFromLessonPlanResponse> => {
        const response = await apiClient.post<PrepareAssignmentFromLessonPlanResponse>(
            `${LESSON_PLANS_BASE_PATH}/${id}/prepare-assignment/`,
            withClientMutationId(payload, 'lesson-plan-prepare-assignment'),
        );
        return response.data;
    },

    getPreparedAssignments: async (
        id: number,
    ): Promise<PreparedAssignmentsForLessonPlanResponse> => {
        const response = await apiClient.get<PreparedAssignmentsForLessonPlanResponse>(
            `${LESSON_PLANS_BASE_PATH}/${id}/prepared-assignments/`
        );
        return response.data;
    },
};
