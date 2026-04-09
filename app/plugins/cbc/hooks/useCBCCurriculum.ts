import { useMemo } from 'react';
import { useCurricula } from '@/app/core/hooks/useAcademic';

const CBC_CURRICULUM_TYPE = 'CBE' as const;

export function useCBCCurriculum() {
    const { curricula, loading, error } = useCurricula();

    const cbcCurriculum = useMemo(
        () => curricula.find(c => c.curriculum_type === CBC_CURRICULUM_TYPE) ?? null,
        [curricula],
    );

    return {
        cbcCurriculum,
        cbcCurriculumId: cbcCurriculum?.id ?? null,
        loading,
        error,
        isInstalled: cbcCurriculum !== null,
    };
}