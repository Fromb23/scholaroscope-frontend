// ============================================================================
// app/lib/api/policyAPI.ts
// Grade Computation Policy API
// ============================================================================

import { apiClient } from './client';
import {
    GradePolicy,
    GradePolicyPayload,
    ComputedGradeDTO,
    ComputeResponse,
    ComputeGradesPayload,
    PolicyFilters,
    PolicyContextFilters,
    ComputedGradeFilters
} from '@/app/core/types/gradePolicy';

/**
 * API functions for grade computation policies
 */
export const policyAPI = {
    // ============================================================================
    // Grade Policies
    // ============================================================================

    /**
     * Get all grade policies with optional filters
     */
    getGradePolicies: async (filters?: PolicyFilters): Promise<GradePolicy[]> => {
        const { data } = await apiClient.get<{ results: GradePolicy[] }>(
            '/reporting/grade-policies/',
            { params: filters }
        );
        return data.results;
    },

    /**
     * Get a single grade policy by ID
     */
    getGradePolicy: async (id: number): Promise<GradePolicy> => {
        const { data } = await apiClient.get<GradePolicy>(
            `/reporting/grade-policies/${id}/`
        );
        return data;
    },

    /**
     * Create a new grade policy
     */
    createGradePolicy: async (payload: GradePolicyPayload): Promise<GradePolicy> => {
        const { data } = await apiClient.post<GradePolicy>(
            '/reporting/grade-policies/',
            payload
        );
        return data;
    },

    /**
     * Update an existing grade policy
     */
    updateGradePolicy: async (
        id: number,
        payload: Partial<GradePolicyPayload>
    ): Promise<GradePolicy> => {
        const { data } = await apiClient.patch<GradePolicy>(
            `/reporting/grade-policies/${id}/`,
            payload
        );
        return data;
    },

    /**
     * Delete a grade policy
     */
    deleteGradePolicy: async (id: number): Promise<void> => {
        await apiClient.delete(`/reporting/grade-policies/${id}/`);
    },

    /**
     * Duplicate an existing policy
     */
    duplicateGradePolicy: async (id: number): Promise<GradePolicy> => {
        const { data } = await apiClient.post<GradePolicy>(
            `/reporting/grade-policies/${id}/duplicate/`
        );
        return data;
    },

    /**
     * Get the most appropriate policy for a given context
     * Uses priority: cohort_subject > cohort > curriculum > default
     */
    getPolicyForContext: async (filters: PolicyContextFilters): Promise<GradePolicy> => {
        const { data } = await apiClient.get<GradePolicy>(
            '/reporting/grade-policies/get_policy_for_context/',
            { params: filters }
        );
        return data;
    },

    // ============================================================================
    // Computed Grades
    // ============================================================================

    /**
     * Get computed grades with optional filters
     */
    getComputedGrades: async (filters?: ComputedGradeFilters): Promise<ComputedGradeDTO[]> => {
        const { data } = await apiClient.get<{ results: ComputedGradeDTO[] }>(
            '/reporting/computed-grades/',
            { params: filters }
        );
        return data.results;
    },

    /**
     * Get a single computed grade by ID
     */
    getComputedGrade: async (id: number): Promise<ComputedGradeDTO> => {
        const { data } = await apiClient.get<ComputedGradeDTO>(
            `/reporting/computed-grades/${id}/`
        );
        return data;
    },

    /**
     * Compute grades for a term using policies
     * This is the main computation engine
     */
    computeGradesWithPolicy: async (payload: ComputeGradesPayload): Promise<ComputeResponse> => {
        const { data } = await apiClient.post<ComputeResponse>(
            '/reporting/computed-grades/compute_with_policy/',
            payload
        );
        return data;
    },

    /**
     * Get all computed grades for a specific student
     */
    getComputedGradesByStudent: async (studentId: number): Promise<ComputedGradeDTO[]> => {
        const { data } = await apiClient.get<ComputedGradeDTO[]>(
            '/reporting/computed-grades/by_student/',
            { params: { student_id: studentId } }
        );
        return data;
    }
};