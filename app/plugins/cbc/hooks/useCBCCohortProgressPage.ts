import { useEffect, useMemo, useState } from 'react';
import { useCBCProgressSummary } from '@/app/plugins/cbc/hooks/useCBC';
import { useCohort, useSubjects } from '@/app/core/hooks/useAcademic';

export function useCBCCohortProgressPage(cohortId: number) {
    const { cohort, loading: cohortLoading } = useCohort(cohortId);
    const { subjects = [] } = useSubjects(cohort?.curriculum ?? undefined);

    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null;

        try {
            const stored = localStorage.getItem(`cbc_cohort_subject_${cohortId}`);
            return stored ? Number(stored) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        if (selectedSubjectId === null) return;

        try {
            localStorage.setItem(`cbc_cohort_subject_${cohortId}`, String(selectedSubjectId));
        } catch {
            // Ignore localStorage failures and preserve existing behavior.
        }
    }, [selectedSubjectId, cohortId]);

    useEffect(() => {
        if (subjects.length === 1 && selectedSubjectId === null) {
            setSelectedSubjectId(subjects[0].id);
        }
    }, [subjects, selectedSubjectId]);

    const { data: summary, isLoading, error, refetch } = useCBCProgressSummary({
        cohort_id: cohortId,
        subject_id: selectedSubjectId,
    });

    const totalLearners = useMemo(() => {
        if (!summary) return 0;
        return Object.values(summary.competency).reduce((sum, count) => sum + count, 0);
    }, [summary]);

    return {
        cohort,
        cohortLoading,
        subjects,
        selectedSubjectId,
        setSelectedSubjectId,
        summary,
        isLoading,
        error,
        refetch,
        totalLearners,
    };
}
