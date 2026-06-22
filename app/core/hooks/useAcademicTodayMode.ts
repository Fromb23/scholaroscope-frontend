'use client';

import { useQuery } from '@tanstack/react-query';

import { academicTodayModeAPI } from '@/app/core/api/academic';
import { academicKeys } from '@/app/core/lib/queryKeys';
import type { AcademicTodayMode } from '@/app/core/types/academic';
import { useOrganizationContext } from '@/app/context/OrganizationContext';

export function useAcademicTodayMode(options?: { enabled?: boolean }) {
    const { organizationId } = useOrganizationContext();

    return useQuery<AcademicTodayMode, Error>({
        queryKey: academicKeys.todayMode.detail(organizationId),
        queryFn: () => academicTodayModeAPI.getTodayMode(),
        enabled: options?.enabled ?? true,
        staleTime: 0,
        refetchOnMount: 'always',
    });
}
