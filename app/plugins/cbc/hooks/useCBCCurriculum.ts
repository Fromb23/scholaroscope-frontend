import { useMemo } from 'react';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { resolveCurriculumForType } from '@/app/core/lib/curriculumLifecycle';

const CBC_CURRICULUM_TYPE = 'CBE' as const;

export function useCBCCurriculum() {
    const { curricula, loading, error } = useCurricula();

    const cbcCurriculum = useMemo(
        () => resolveCurriculumForType(curricula, CBC_CURRICULUM_TYPE),
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
