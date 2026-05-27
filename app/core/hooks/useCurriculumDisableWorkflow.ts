'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { curriculumAPI, curriculumDisableRequestAPI } from '@/app/core/api/academic';
import { academicKeys } from '@/app/core/lib/queryKeys';
import type {
  CurriculumDisableImpactResponse,
  CurriculumDisableRequest,
  CurriculumDisableRequestStatus,
  CurriculumDisableRequestTransitionPayload,
  RequestCurriculumDisablePayload,
} from '@/app/core/types/academic';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import { useOrganizationContext } from '@/app/context/OrganizationContext';

const POLLING_STATUSES: CurriculumDisableRequestStatus[] = [
  'DRAINING',
  'WAITING_DUE_DATES',
  'FINALIZING',
];

function shouldPoll(status?: CurriculumDisableRequestStatus | null): boolean {
  return Boolean(status && POLLING_STATUSES.includes(status));
}

function toError(error: unknown, fallback: string): Error {
  return new Error(extractErrorMessage(error as ApiError, fallback));
}

function invalidateCurriculumDisableQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: number | null,
  curriculumId?: number | null,
  requestId?: number | null,
) {
  queryClient.invalidateQueries({ queryKey: academicKeys.curricula.list(organizationId) });
  queryClient.invalidateQueries({ queryKey: academicKeys.curriculumDisableRequests.all });

  if (typeof curriculumId === 'number') {
    queryClient.invalidateQueries({ queryKey: academicKeys.curricula.detail(curriculumId) });
    queryClient.invalidateQueries({ queryKey: academicKeys.curricula.disableImpact(curriculumId) });
  }

  if (typeof requestId === 'number') {
    queryClient.invalidateQueries({ queryKey: academicKeys.curriculumDisableRequests.detail(requestId) });
  }
}

export function useCurriculumDisableImpact(curriculumId: number | null, enabled = true) {
  return useQuery<CurriculumDisableImpactResponse, Error>({
    queryKey: academicKeys.curricula.disableImpact(curriculumId),
    queryFn: async () => {
      if (!curriculumId) {
        throw new Error('Curriculum is required.');
      }

      try {
        return await curriculumAPI.getDisableImpact(curriculumId);
      } catch (error) {
        throw toError(error, 'Failed to load curriculum disable impact.');
      }
    },
    enabled: enabled && typeof curriculumId === 'number' && curriculumId > 0,
  });
}

export function useCurriculumDisableRequest(requestId: number | null, enabled = true) {
  return useQuery<CurriculumDisableRequest, Error>({
    queryKey: academicKeys.curriculumDisableRequests.detail(requestId),
    queryFn: async () => {
      if (!requestId) {
        throw new Error('Disable request is required.');
      }

      try {
        return await curriculumDisableRequestAPI.getById(requestId);
      } catch (error) {
        throw toError(error, 'Failed to load curriculum disable request.');
      }
    },
    enabled: enabled && typeof requestId === 'number' && requestId > 0,
    refetchInterval: (query) => shouldPoll(query.state.data?.status) ? 10000 : false,
  });
}

export function useCurriculumDisableRequests(filters?: {
  curriculum?: number;
  mode?: string;
  status?: string;
  ordering?: string;
}) {
  const { organizationId } = useOrganizationContext();
  const requestFilters = useMemo(
    () => ({
      organization: organizationId ?? undefined,
      curriculum: filters?.curriculum,
      mode: filters?.mode,
      status: filters?.status,
      ordering: filters?.ordering,
    }),
    [filters?.curriculum, filters?.mode, filters?.ordering, filters?.status, organizationId],
  );

  return useQuery<CurriculumDisableRequest[], Error>({
    queryKey: academicKeys.curriculumDisableRequests.list(requestFilters),
    queryFn: async () => {
      try {
        return await curriculumDisableRequestAPI.getAll(requestFilters);
      } catch (error) {
        throw toError(error, 'Failed to load curriculum disable requests.');
      }
    },
  });
}

export function useRequestCurriculumDisable(curriculumId: number) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: async (payload: RequestCurriculumDisablePayload) => {
      try {
        return await curriculumAPI.requestDisable(curriculumId, payload);
      } catch (error) {
        throw toError(error, 'Failed to request curriculum disable.');
      }
    },
    onSuccess: (response) => {
      invalidateCurriculumDisableQueries(
        queryClient,
        organizationId,
        curriculumId,
        response.request.id,
      );
    },
  });
}

export function useConfirmCurriculumDisableRequest(requestId: number, curriculumId?: number | null) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: async (payload?: CurriculumDisableRequestTransitionPayload) => {
      try {
        return await curriculumDisableRequestAPI.confirm(requestId, payload);
      } catch (error) {
        throw toError(error, 'Failed to confirm curriculum disable request.');
      }
    },
    onSuccess: (response) => {
      invalidateCurriculumDisableQueries(
        queryClient,
        organizationId,
        curriculumId ?? response.curriculum,
        response.id,
      );
    },
  });
}

export function useCancelCurriculumDisableRequest(requestId: number, curriculumId?: number | null) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: async () => {
      try {
        return await curriculumDisableRequestAPI.cancel(requestId);
      } catch (error) {
        throw toError(error, 'Failed to cancel curriculum disable request.');
      }
    },
    onSuccess: (response) => {
      invalidateCurriculumDisableQueries(
        queryClient,
        organizationId,
        curriculumId ?? response.curriculum,
        response.id,
      );
    },
  });
}

export function useRetryCurriculumDisableRequest(requestId: number, curriculumId?: number | null) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: async () => {
      try {
        return await curriculumDisableRequestAPI.retry(requestId);
      } catch (error) {
        throw toError(error, 'Failed to retry curriculum disable request.');
      }
    },
    onSuccess: (response) => {
      invalidateCurriculumDisableQueries(
        queryClient,
        organizationId,
        curriculumId ?? response.curriculum,
        response.id,
      );
    },
  });
}

export function useReactivateCurriculum(curriculumId: number) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: async () => {
      try {
        return await curriculumAPI.reactivate(curriculumId);
      } catch (error) {
        throw toError(error, 'Failed to reactivate curriculum.');
      }
    },
    onSuccess: () => {
      invalidateCurriculumDisableQueries(
        queryClient,
        organizationId,
        curriculumId,
        null,
      );
    },
  });
}
