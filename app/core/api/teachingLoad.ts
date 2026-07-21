import type {
    HistoryEntry,
    InstructorCohortAccessAssignment,
    TeachingAssignment,
} from '@/app/core/types/academic';
import { apiClient } from './client';

export interface MyTeachingLoadResponse {
    instructor_id: number;
    organization: string | null;
    total_assigned: number;
    assignments: TeachingAssignment[];
    cohort_assignments: InstructorCohortAccessAssignment[];
    progress_included?: boolean;
}

export interface MyTeachingHistoryResponse {
    instructor_id: number;
    history: HistoryEntry[];
}

export const teachingLoadAPI = {
    getMyTeachingLoad: async (params?: { include_progress?: boolean }): Promise<MyTeachingLoadResponse> => {
        const response = await apiClient.get<MyTeachingLoadResponse>('/users/my_teaching_load/', { params });
        return response.data;
    },
    getMyTeachingHistory: async (): Promise<MyTeachingHistoryResponse> => {
        const response = await apiClient.get<MyTeachingHistoryResponse>('/users/my_teaching_history/');
        return response.data;
    },
};
