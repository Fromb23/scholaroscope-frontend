import { apiClient } from './client';
import type {
  GroupingContextResponse,
  GroupingContextType,
  GroupingLearner,
} from '@/app/core/types/grouping';

function base(type: GroupingContextType, id: number) {
  return `/grouping/contexts/${type}/${id}`;
}

export const groupingAPI = {
  context: async (type: GroupingContextType, id: number) =>
    (await apiClient.get<GroupingContextResponse>(`${base(type, id)}/`)).data,
  bind: async (type: GroupingContextType, id: number) =>
    (await apiClient.post<GroupingContextResponse>(`${base(type, id)}/bind/`)).data,
  preview: async (
    type: GroupingContextType,
    id: number,
    payload: {
      mode: 'BY_GROUP_COUNT' | 'BY_MEMBERS_PER_GROUP';
      group_count?: number;
      members_per_group?: number;
      name_prefix: string;
    },
  ) =>
    (
      await apiClient.post<{
        groups: Array<{
          id?: number | null;
          client_id: string;
          name: string;
          notes: string;
          members: GroupingLearner[];
        }>;
        eligible_count: number;
        revision: number;
      }>(`${base(type, id)}/random-preview/`, payload)
    ).data,
  save: async (
    type: GroupingContextType,
    id: number,
    payload: {
      revision: number;
      groups: Array<{ id?: number; name: string; notes?: string; student_ids: number[] }>;
    },
  ) =>
    (await apiClient.put<GroupingContextResponse>(`${base(type, id)}/allocation/`, payload)).data,
  correctRoster: async (
    type: GroupingContextType,
    id: number,
    payload: {
      revision: number;
      reason: string;
      groups: Array<{ id?: number; name: string; notes?: string; student_ids: number[] }>;
    },
  ) =>
    (await apiClient.post<GroupingContextResponse>(`${base(type, id)}/roster-correction/`, payload))
      .data,
  admitLate: async (
    type: GroupingContextType,
    id: number,
    payload: {
      revision: number;
      participant: number;
      group: number;
      task_executions: number[];
    },
  ) =>
    (await apiClient.post<GroupingContextResponse>(`${base(type, id)}/late-admission/`, payload))
      .data,
  reconcile: async (type: GroupingContextType, id: number, dryRun = false) =>
    (
      await apiClient.post<{
        summary: Record<string, number>;
        grouping: GroupingContextResponse;
      }>(`${base(type, id)}/reconcile/`, { dry_run: dryRun })
    ).data,
};
