import { apiClient } from '@/app/core/api/client';
import type { PaginatedResponse } from '@/app/core/types/api';
import type { ApiError } from '@/app/core/types/errors';
import type { LessonPlanCurriculumContext } from '@/app/core/types/lessonPlanCurriculum';
import type {
    GenerateLessonPlanFromSessionPayload,
    GenerateLessonPlanPayload,
    GenerateLessonPlanResponse,
    LessonPlanAssignmentDraftResponse,
    LessonPlan,
    LessonPlanCreatePayload,
    LessonPlanQueryParams,
    LessonPlanUpdatePayload,
    MarkUsedPayload,
    ScheduleLessonPayload,
    ScheduleLessonResponse,
} from '@/app/core/types/lessonPlans';

export const LESSON_PLANS_BASE_PATH = '/lesson-plans';

function getDownloadFileName(
    headerValue: string | undefined,
    fallback: string,
): string {
    if (!headerValue) {
        return fallback;
    }

    const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]).replace(/^"(.*)"$/, '$1');
    }

    const asciiMatch = headerValue.match(/filename="?([^";]+)"?/i);
    if (asciiMatch?.[1]) {
        return asciiMatch[1];
    }

    return fallback;
}

function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function normalizeBlobError(error: unknown): Promise<never> {
    const apiError = error as ApiError & {
        response?: {
            data?: Blob | string | Record<string, unknown>;
            status?: number;
        };
    };
    const data = apiError.response?.data;

    if (data instanceof Blob) {
        const rawText = await data.text();
        let parsedData: NonNullable<ApiError['response']>['data'] = rawText;

        try {
            parsedData = JSON.parse(rawText) as NonNullable<ApiError['response']>['data'];
        } catch {
            parsedData = rawText;
        }

        throw {
            ...apiError,
            response: {
                ...apiError.response,
                data: parsedData,
            },
        } satisfies ApiError;
    }

    throw error;
}

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

    exportPdf: async (id: number): Promise<void> => {
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
            downloadBlob(response.data, fileName);
        } catch (error) {
            await normalizeBlobError(error);
        }
    },

    create: async (payload: LessonPlanCreatePayload): Promise<LessonPlan> => {
        const response = await apiClient.post<LessonPlan>(`${LESSON_PLANS_BASE_PATH}/`, payload);
        return response.data;
    },

    getCurriculumContext: async (cohortSubjectId: number): Promise<LessonPlanCurriculumContext> => {
        const response = await apiClient.get<LessonPlanCurriculumContext>(
            `${LESSON_PLANS_BASE_PATH}/curriculum-context/`,
            {
                params: { cohort_subject: cohortSubjectId },
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

    createAssignmentDraft: async (id: number): Promise<LessonPlanAssignmentDraftResponse> => {
        const response = await apiClient.post<LessonPlanAssignmentDraftResponse>(
            `${LESSON_PLANS_BASE_PATH}/${id}/create_assignment_draft/`
        );
        return response.data;
    },
};
