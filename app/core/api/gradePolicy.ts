// app/core/api/gradePolicy.ts

import { apiClient } from './client';
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

interface Paginated<T> { results?: T[]; count?: number; }

function unwrap<T>(data: T[] | Paginated<T>): T[] {
    return Array.isArray(data) ? data : data?.results ?? [];
}

export const gradePolicyAPI = {
    // ── Policies ──────────────────────────────────────────────────────────

    getAll: async (filters?: PolicyFilters): Promise<GradePolicy[]> => {
        const { data } = await apiClient.get<GradePolicy[] | Paginated<GradePolicy>>(
            '/reporting/grade-policies/', { params: filters }
        );
        return unwrap(data);
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
        const { data } = await apiClient.get<ComputedGradeDTO[] | Paginated<ComputedGradeDTO>>(
            '/reporting/computed-grades/', { params: filters }
        );
        return unwrap(data);
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