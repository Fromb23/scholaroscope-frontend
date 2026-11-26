'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { dashboardAPI } from '@/app/core/api/dashboards';
import { dashboardKeys } from '@/app/core/lib/queryKeys';
import type { ApiError } from '@/app/core/types/errors';
import { resolveErrorMessage } from '@/app/core/types/errors';

export function useInstructorTeachingTodayDashboard(options: { enabled?: boolean } = {}) {
  const { user, activeOrg, workspaceGeneration } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.instructorTeachingToday(
      activeOrg?.id ?? null,
      user?.id ?? null,
      workspaceGeneration,
    ),
    queryFn: async () => {
      try {
        return await dashboardAPI.getInstructorTeachingToday();
      } catch (error) {
        throw new Error(resolveErrorMessage(error as ApiError, 'Could not load Teaching Today.'));
      }
    },
    enabled: (options.enabled ?? true) && Boolean(user && activeOrg),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    refetchInterval: () => (
      typeof document === 'undefined' || document.visibilityState === 'visible'
        ? 5 * 60_000
        : false
    ),
  });
}
