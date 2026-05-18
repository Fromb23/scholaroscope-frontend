import { apiClient } from '@/app/core/api/client';
import type { PaginatedResponse } from '@/app/core/types/api';
import type {
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
            { params }
        );
        return response.data;
    },

    getById: async (id: number): Promise<LessonPlan> => {
        const response = await apiClient.get<LessonPlan>(`${LESSON_PLANS_BASE_PATH}/${id}/`);
        return response.data;
    },

    create: async (payload: LessonPlanCreatePayload): Promise<LessonPlan> => {
        const response = await apiClient.post<LessonPlan>(`${LESSON_PLANS_BASE_PATH}/`, payload);
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
};
