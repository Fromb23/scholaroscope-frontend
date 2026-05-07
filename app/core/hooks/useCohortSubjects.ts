// ============================================================================
// app/core/hooks/useCohortSubjects.ts
//
// Fetches CohortSubject records scoped to an academic year.
// Replaces direct cohortSubjectAPI.getAll() calls in pages.
// ============================================================================

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cohortSubjectAPI } from '@/app/core/api/academic';
import { academicKeys } from '@/app/core/lib/queryKeys';
import type { CohortSubject } from '@/app/core/types/academic';

// ── Extended type ─────────────────────────────────────────────────────────
// The API returns more fields than the base CohortSubject type declares.
// Extend rather than cast to any.

export interface CohortSubjectExtended extends CohortSubject {
    academic_year?: number;
    is_current_year?: boolean;
    curriculum_name: string; // already on base type
    // curriculum_type is NOT returned — filter by curriculum_name instead
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useCohortSubjects(academicYearId?: number) {
    const [cohortSubjects, setCohortSubjects] = useState<CohortSubjectExtended[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        const params: Record<string, string> = {};
        if (academicYearId) params.academic_year = String(academicYearId);

        cohortSubjectAPI.getAll(params)
            .then(data => {
                const arr = Array.isArray(data)
                    ? data
                    : (data as { results?: CohortSubjectExtended[] })?.results ?? [];

                // Filter out CBE curriculum by name — no curriculum_type field on type
                setCohortSubjects(
                    (arr as CohortSubjectExtended[]).filter(
                        cs => !cs.curriculum_name?.includes('CBE')
                    )
                );
            })
            .catch(() => {
                setError('Failed to load cohort subjects');
                setCohortSubjects([]);
            })
            .finally(() => setLoading(false));
    }, [academicYearId]);

    return { cohortSubjects, loading, error };
}

export function useCohortSubjectsByCohort(cohortId?: number | null) {
    const enabled = typeof cohortId === 'number' && cohortId > 0;
    const query = useQuery<CohortSubjectExtended[], Error>({
        queryKey: academicKeys.cohorts.subjects(cohortId ?? null),
        queryFn: async () => {
            const data = await cohortSubjectAPI.getAll({ cohort: String(cohortId) });
            return Array.isArray(data)
                ? data as CohortSubjectExtended[]
                : (data as { results?: CohortSubjectExtended[] })?.results ?? [];
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        subjects: query.data ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useCohortSubjectsByCohorts(cohortIds?: number[] | null) {
    const [subjects, setSubjects] = useState<CohortSubjectExtended[]>([]);
    const [loading, setLoading] = useState(false);
    const cohortIdsKey = (cohortIds ?? []).join(',');

    useEffect(() => {
        let active = true;
        const ids = cohortIdsKey
            .split(',')
            .filter(value => value !== '')
            .map(value => Number(value))
            .filter(value => Number.isFinite(value));

        if (ids.length === 0) {
            setSubjects([]);
            setLoading(false);
            return () => {
                active = false;
            };
        }

        setLoading(true);

        Promise.all(ids.map(id => cohortSubjectAPI.getByCohort(id)))
            .then(results => {
                if (!active) return;

                const flattened = results.flatMap(data => (
                    Array.isArray(data)
                        ? data
                        : (data as { results?: CohortSubjectExtended[] })?.results ?? []
                ));

                const deduped = Array.from(
                    new Map(
                        flattened.map(subject => [subject.id, subject as CohortSubjectExtended])
                    ).values()
                );

                setSubjects(deduped);
            })
            .catch(() => {
                if (!active) return;
                setSubjects([]);
            })
            .finally(() => {
                if (!active) return;
                setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [cohortIdsKey]);

    return { subjects, loading };
}
