import { useQuery } from '@tanstack/react-query';
import { cbcTeachingLoadAPI } from '@/app/plugins/cbc/api/cbc';
import type { MyCBCTeachingLoad } from '@/app/plugins/cbc/types/cbc';

export const useMyCBCTeachingLoad = () => {
    const { data, isLoading, error } = useQuery<MyCBCTeachingLoad>({
        queryKey: ['cbc', 'my-teaching-load'],
        queryFn: cbcTeachingLoadAPI.myTeachingLoad,
        staleTime: 0,
    });

    const subjectIds = data?.assignments.map(a => a.subject_id) ?? [];
    const cohortIds = data?.assignments.map(a => a.cohort_id) ?? [];
    const isAdmin = data?.role === 'ADMIN';

    return {
        role: data?.role ?? null,
        assignments: data?.assignments ?? [],
        subjectIds,
        cohortIds,
        isAdmin,
        totalAssigned: data?.total_assigned ?? 0,
        loading: isLoading,
        error,
    };
};