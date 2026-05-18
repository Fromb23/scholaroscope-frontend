import { apiClient } from '@/app/core/api/client';
import { toArray } from '@/app/plugins/cbc/lib/apiHelpers';
import type { CbcLessonPlanOutcomeOption } from '@/app/plugins/cbc/types/cbc';

export const cbcLessonPlanOutcomeAPI = {
    getAll: async (cohortSubjectId: number): Promise<CbcLessonPlanOutcomeOption[]> => {
        const response = await apiClient.get<
            CbcLessonPlanOutcomeOption[] | { results?: CbcLessonPlanOutcomeOption[] }
        >('/cbc/lesson-plan/outcomes/', {
            params: { cohort_subject: cohortSubjectId },
        });

        return toArray(response.data);
    },
};
