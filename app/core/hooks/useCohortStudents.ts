// ============================================================================
// app/core/hooks/useCohortStudents.ts
//
// Owns all cohort student enrollment state and mutations.
// No API calls in pages. No alert() calls.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { cohortAPI } from '@/app/core/api/academic';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';

// ── Types ─────────────────────────────────────────────────────────────────

export interface EnrolledStudent {
    id: number;
    admission_number: string;
    full_name: string;
    enrollment_id: number;
    enrollment_type: string;
    enrolled_date: string;
    is_primary_cohort: boolean;
    email: string;
    phone: string;
}

export interface AvailableStudent {
    id: number;
    admission_number: string;
    full_name: string;
    primary_cohort_name?: string;
    email: string;
}

export interface BulkEnrollResult {
    created: number;
    reactivated: number;
    already_active: number;
}

export interface BulkUnenrollResult {
    unenrolled: number;
    primary_cleared: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useCohortStudents(cohortId: number) {
    const [cohortName, setCohortName] = useState('');
    const [enrolled, setEnrolled] = useState<EnrolledStudent[]>([]);
    const [available, setAvailable] = useState<AvailableStudent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [enrolledData, availableData] = await Promise.all([
                cohortAPI.getEnrolledStudents(cohortId),
                cohortAPI.getAvailableStudents(cohortId),
            ]);
            setEnrolled(enrolledData as EnrolledStudent[]);
            setAvailable(
                (availableData?.available_students ?? availableData) as AvailableStudent[]
            );
            setCohortName(
                (enrolledData as { cohort_name?: string }).cohort_name ?? ''
            );
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to load student data'));
        } finally {
            setLoading(false);
        }
    }, [cohortId]);

    useEffect(() => { loadData(); }, [loadData]);

    const searchAvailable = async (query: string) => {
        try {
            const data = await cohortAPI.getAvailableStudents(cohortId, query);
            setAvailable(
                (data?.available_students ?? data) as AvailableStudent[]
            );
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Search failed'));
        }
    };

    const bulkEnroll = async (
        studentIds: number[],
        enrollmentType: string,
        notes: string
    ): Promise<BulkEnrollResult> => {
        const result = await cohortAPI.bulkEnrollStudents(
            cohortId, studentIds, enrollmentType, notes || 'Bulk enrollment'
        );
        await loadData();
        return result as BulkEnrollResult;
    };

    const bulkUnenroll = async (
        studentIds: number[],
        notes: string
    ): Promise<BulkUnenrollResult> => {
        const result = await cohortAPI.bulkUnenrollStudents(
            cohortId, studentIds, notes || 'Bulk unenrollment'
        );
        await loadData();
        return result as BulkUnenrollResult;
    };

    return {
        cohortName,
        enrolled,
        available,
        loading,
        error,
        refetch: loadData,
        searchAvailable,
        bulkEnroll,
        bulkUnenroll,
        clearError: () => setError(null),
    };
}