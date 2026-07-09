// app/core/api/gradePolicy.ts

import { apiClient } from './client';
import { unwrapPaginated } from './unwrap';
import {
    GradePolicy,
    GradePolicyPayload,
    ComputedGradeDTO,
    ComputeResponse,
    ComputeGradesPayload,
    PolicyFilters,
    PolicyContextFilters,
    ComputedGradeFilters,
} from '@/app/core/types/gradePolicy';

export const gradePolicyAPI = {
    // ── Policies ──────────────────────────────────────────────────────────

    getAll: async (filters?: PolicyFilters): Promise<GradePolicy[]> => {
        const { data } = await apiClient.get<GradePolicy[] | { results?: GradePolicy[]; count?: number }>(
            '/reporting/grade-policies/', { params: filters }
        );
        return unwrapPaginated(data);
    },

    getById: async (id: number): Promise<GradePolicy> => {
        const { data } = await apiClient.get<GradePolicy>(`/reporting/grade-policies/${id}/`);
        return data;
    },

    create: async (payload: GradePolicyPayload): Promise<GradePolicy> => {
        const { data } = await apiClient.post<GradePolicy>('/reporting/grade-policies/', payload);
        return data;
    },

    update: async (id: number, payload: Partial<GradePolicyPayload>): Promise<GradePolicy> => {
        const { data } = await apiClient.patch<GradePolicy>(
            `/reporting/grade-policies/${id}/`, payload
        );
        return data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/reporting/grade-policies/${id}/`);
    },

    getForContext: async (filters: PolicyContextFilters): Promise<GradePolicy> => {
        const { data } = await apiClient.get<GradePolicy>(
            '/reporting/grade-policies/get_policy_for_context/', { params: filters }
        );
        return data;
    },

    // ── Computed Grades ───────────────────────────────────────────────────

    getComputedGrades: async (filters?: ComputedGradeFilters): Promise<ComputedGradeDTO[]> => {
        const { data } = await apiClient.get<ComputedGradeDTO[] | { results?: ComputedGradeDTO[]; count?: number }>(
            '/reporting/computed-grades/', { params: filters }
        );
        return unwrapPaginated(data);
    },

    computeWithPolicy: async (payload: ComputeGradesPayload): Promise<ComputeResponse> => {
        const { data } = await apiClient.post<ComputeResponse>(
            '/reporting/computed-grades/compute_with_policy/', payload
        );
        return data;
    },

    getComputedByStudent: async (studentId: number): Promise<ComputedGradeDTO[]> => {
        const { data } = await apiClient.get<ComputedGradeDTO[]>(
            '/reporting/computed-grades/by_student/', { params: { student_id: studentId } }
        );
        return data;
    },
};
