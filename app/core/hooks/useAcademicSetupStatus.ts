'use client';

import { useQuery } from '@tanstack/react-query';

import { academicSetupAPI } from '@/app/core/api/academic';
import { academicKeys } from '@/app/core/lib/queryKeys';
import type { AcademicSetupStatus } from '@/app/core/types/academic';
import { useOrganizationContext } from '@/app/context/OrganizationContext';

export function useAcademicSetupStatus(options?: { enabled?: boolean }) {
    const { organizationId } = useOrganizationContext();

    return useQuery<AcademicSetupStatus, Error>({
        queryKey: academicKeys.setupStatus.detail(organizationId),
        queryFn: () => academicSetupAPI.getStatus(),
        enabled: options?.enabled ?? true,
        staleTime: 0,
        refetchOnMount: 'always',
    });
}
