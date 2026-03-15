// ============================================================================
// app/hooks/useGradePolicies.ts
// Grade Computation Policy Hooks
// ============================================================================

import { useState, useEffect } from 'react';
import { policyAPI } from '@/app/core/api/reporting';
import { ReportFilters } from '../types/reporting';
import { GradePolicy, ComputedGradeDTO } from '@/app/core/types/gradePolicy';

interface PolicyFilters {
    cohort_subject?: number;
    cohort?: number;
    curriculum?: number;
    term?: number;
    is_active?: boolean;
}

interface PolicyContextFilters {
    cohort_subject_id?: number;
    cohort_id?: number;
    curriculum_id?: number;
    term_id?: number;
}

/**
 * Hook for managing grade computation policies
 * @param filters - Optional filters for fetching policies
 */
export function useGradePolicies(filters?: PolicyFilters) {
    const [policies, setPolicies] = useState<GradePolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPolicies = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await policyAPI.getGradePolicies(filters as ReportFilters);
            const policiesArray = Array.isArray(response)
                ? response
                : (response as { results?: GradePolicy[] }).results ?? []
            setPolicies(policiesArray);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch policies';
            setError(message);
            console.error('Error fetching policies:', err);
        } finally {
            setLoading(false);
        }
    };

    const getPolicyForContext = async (context: PolicyContextFilters): Promise<GradePolicy | null> => {
        try {
            return await policyAPI.getPolicyForContext(context as ReportFilters);
        } catch (err) {
            console.error('Error getting policy for context:', err);
            throw err;
        }
    };

    const createPolicy = async (policyData: Partial<GradePolicy>): Promise<GradePolicy> => {
        try {
            const response = await policyAPI.createGradePolicy(policyData);
            await fetchPolicies();
            return response;
        } catch (err) {
            console.error('Error creating policy:', err);
            throw err;
        }
    };

    const updatePolicy = async (id: number, policyData: Partial<GradePolicy>): Promise<GradePolicy> => {
        try {
            const response = await policyAPI.updateGradePolicy(id, policyData);
            await fetchPolicies();
            return response;
        } catch (err) {
            console.error('Error updating policy:', err);
            throw err;
        }
    };

    const deletePolicy = async (id: number): Promise<void> => {
        try {
            await policyAPI.deleteGradePolicy(id);
            await fetchPolicies();
        } catch (err) {
            console.error('Error deleting policy:', err);
            throw err;
        }
    };

    const duplicatePolicy = async (id: number): Promise<GradePolicy> => {
        try {
            const response = await policyAPI.duplicateGradePolicy(id);
            await fetchPolicies();
            return response;
        } catch (err) {
            console.error('Error duplicating policy:', err);
            throw err;
        }
    };

    useEffect(() => {
        fetchPolicies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        filters?.cohort_subject,
        filters?.cohort,
        filters?.curriculum,
        filters?.term,
        filters?.is_active
    ]);

    return {
        policies,
        loading,
        error,
        refetch: fetchPolicies,
        getPolicyForContext,
        createPolicy,
        updatePolicy,
        deletePolicy,
        duplicatePolicy
    };
}

interface ComputedGradeFilters {
    student?: number;
    term?: number;
    cohort_subject?: number;
    policy?: number;
}

/**
 * Hook for managing computed grades (with policies)
 * @param filters - Optional filters for fetching computed grades
 */
export function useComputedGrades(filters?: ComputedGradeFilters) {
    const [grades, setGrades] = useState<ComputedGradeDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGrades = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await policyAPI.getComputedGrades(filters as ReportFilters);
            setGrades(Array.isArray(response) ? response : []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch computed grades';
            setError(message);
            console.error('Error fetching computed grades:', err);
        } finally {
            setLoading(false);
        }
    };

    const computeWithPolicy = async (
        termId: number,
        cohortId?: number,
        policyId?: number
    ): Promise<void> => {
        try {
            await policyAPI.computeGradesWithPolicy({
                term_id: termId,
                cohort_id: cohortId,
                policy_id: policyId
            });
            await fetchGrades();
        } catch (err) {
            console.error('Error computing grades with policy:', err);
            throw err;
        }
    };

    const getGradesByStudent = async (studentId: number): Promise<ComputedGradeDTO[]> => {
        try {
            return await policyAPI.getComputedGradesByStudent(studentId);
        } catch (err) {
            console.error('Error getting grades by student:', err);
            throw err;
        }
    };

    useEffect(() => {
        const shouldFetch =
            filters?.student !== undefined ||
            filters?.term !== undefined ||
            filters?.cohort_subject !== undefined ||
            filters?.policy !== undefined;

        if (shouldFetch) {
            fetchGrades();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        filters?.student,
        filters?.term,
        filters?.cohort_subject,
        filters?.policy
    ]);

    return {
        grades,
        loading,
        error,
        refetch: fetchGrades,
        computeWithPolicy,
        getGradesByStudent
    };
}

interface GradeComparison {
    total_computed: number;
    total_legacy: number;
    differences: GradeDifference[];
    average_difference: number;
}

interface GradeDifference {
    student_name: string;
    subject_name: string;
    computed_score: number;
    legacy_score: number;
    difference: number;
    policy_name?: string;
}

/**
 * Hook for comparing computed grades vs legacy grades
 * @param termId - Term ID to compare
 * @param cohortId - Optional cohort ID filter
 */
export function useGradeComparison(termId?: number, cohortId?: number) {
    const [comparison, setComparison] = useState<GradeComparison | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchComparison = async () => {
        if (!termId) return;

        try {
            setLoading(true);
            setError(null);

            const filters: ReportFilters & Record<string, unknown> = { term: termId };
            if (cohortId) {
                filters['cohort_subject__cohort'] = cohortId;
            }

            const [computedGrades, legacyGrades] = await Promise.all([
                policyAPI.getComputedGrades(filters),
                // Assuming you have a getGradeSummaries function in your reporting API
                // If not, you'll need to add it
                fetch(`/api/reporting/grade-summaries/?${new URLSearchParams(filters as Record<string, string>)}`).then(r => r.json())
            ]);

            const computed = Array.isArray(computedGrades) ? computedGrades : [];
            const legacy = Array.isArray(legacyGrades) ? legacyGrades : legacyGrades.results || [];

            const differences: GradeDifference[] = [];

            computed.forEach((comp) => {
                const leg = legacy.find((l: unknown) => {
                    const legacyGrade = l as { student: number; cohort_subject: number; weighted_average: number };
                    return legacyGrade.student === comp.student &&
                        legacyGrade.cohort_subject === comp.cohort_subject;
                });

                if (leg) {
                    const diff = Math.abs(comp.final_score - leg.weighted_average);
                    if (diff > 0.1) {
                        differences.push({
                            student_name: comp.student_name,
                            subject_name: comp.subject_name,
                            computed_score: comp.final_score,
                            legacy_score: leg.weighted_average,
                            difference: diff,
                            policy_name: comp.policy_id ? 'Policy Applied' : undefined
                        });
                    }
                }
            });

            setComparison({
                total_computed: computed.length,
                total_legacy: legacy.length,
                differences: differences.sort((a, b) => b.difference - a.difference),
                average_difference: differences.length > 0
                    ? differences.reduce((sum, d) => sum + d.difference, 0) / differences.length
                    : 0
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch comparison';
            setError(message);
            console.error('Error fetching comparison:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (termId) {
            fetchComparison();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [termId, cohortId]);

    return {
        comparison,
        loading,
        error,
        refetch: fetchComparison
    };
}