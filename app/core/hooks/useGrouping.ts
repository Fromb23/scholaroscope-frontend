'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupingAPI } from '@/app/core/api/grouping';
import { useAuth } from '@/app/context/AuthContext';
import type { GroupingContextType } from '@/app/core/types/grouping';

export function groupingKey(orgId: number | null, type: GroupingContextType, id: number) {
  return ['grouping', orgId, type, id] as const;
}

export function useGroupingContext(type: GroupingContextType, id: number, enabled = true) {
  const { activeOrg } = useAuth();
  return useQuery({
    queryKey: groupingKey(activeOrg?.id ?? null, type, id),
    queryFn: () => groupingAPI.context(type, id),
    enabled: Boolean(activeOrg && id > 0 && enabled),
  });
}

export function useGroupingMutations(type: GroupingContextType, id: number) {
  const { activeOrg } = useAuth();
  const queryClient = useQueryClient();
  const key = groupingKey(activeOrg?.id ?? null, type, id);
  const update = (data: Awaited<ReturnType<typeof groupingAPI.context>>) => {
    queryClient.setQueryData(key, data);
    return data;
  };
  return {
    bind: useMutation({ mutationFn: () => groupingAPI.bind(type, id), onSuccess: update }),
    preview: useMutation({
      mutationFn: (payload: Parameters<typeof groupingAPI.preview>[2]) =>
        groupingAPI.preview(type, id, payload),
    }),
    save: useMutation({
      mutationFn: (payload: Parameters<typeof groupingAPI.save>[2]) =>
        groupingAPI.save(type, id, payload),
      onSuccess: update,
    }),
    reconcile: useMutation({
      mutationFn: () => groupingAPI.reconcile(type, id, false),
      onSuccess: (result) => update(result.grouping),
    }),
    invalidateOrigin: () => queryClient.invalidateQueries(),
  };
}
