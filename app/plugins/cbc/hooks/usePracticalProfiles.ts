'use client';

import { useQuery } from '@tanstack/react-query';

import { cbcPracticalsAPI } from '@/app/plugins/cbc/api/practicals';
import { cbcKeys } from '@/app/plugins/cbc/lib/queryKeys';

export function useSessionCbcPracticalProfile(
    sessionId: number | null,
    enabled: boolean = true,
) {
    return useQuery({
        queryKey: sessionId ? cbcKeys.practicals.profile(sessionId) : cbcKeys.practicals.all,
        queryFn: () => cbcPracticalsAPI.getSessionPracticalProfile(sessionId!),
        enabled: Boolean(sessionId) && enabled,
        staleTime: 0,
    });
}
