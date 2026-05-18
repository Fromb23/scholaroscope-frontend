'use client';

import { useQuery } from '@tanstack/react-query';
import { cbcLessonPlanOutcomeAPI } from '@/app/plugins/cbc/api/lessonPlanOutcomes';
import type { ApiError } from '@/app/core/types/errors';
import type { CbcLessonPlanOutcomeOption } from '@/app/plugins/cbc/types/cbc';

function resolveLessonPlanOutcomeError(error: ApiError): string {
    const detail = typeof error?.response?.data === 'string'
        ? error.response.data
        : typeof error?.response?.data === 'object' && error?.response?.data
            ? Object.values(error.response.data).flat().join('\n')
            : '';

    if (error?.response?.status === 403 && detail.toLowerCase().includes('plugin is not active')) {
        return 'CBC lesson planning is not active for this organization.';
    }

    return 'CBC learning outcomes are not available for this class subject. Ask an administrator to check the CBC setup.';
}

export function useCbcLessonPlanOutcomes(cohortSubjectId: number | null) {
    return useQuery<CbcLessonPlanOutcomeOption[], Error>({
        queryKey: ['cbc', 'lesson-plan-outcomes', cohortSubjectId],
        queryFn: async () => {
            try {
                return await cbcLessonPlanOutcomeAPI.getAll(cohortSubjectId!);
            } catch (error) {
                throw new Error(resolveLessonPlanOutcomeError(error as ApiError));
            }
        },
        enabled: Boolean(cohortSubjectId),
        staleTime: 5 * 60 * 1000,
    });
}
