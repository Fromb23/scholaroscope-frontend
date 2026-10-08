'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { projectsAPI, unwrapProjectList } from '@/app/core/api/projects';
import { projectKeys } from '@/app/core/lib/queryKeys';
import type { ProjectFilters } from '@/app/core/types/projects';

function compact(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== '' && item != null),
  );
}

export function useProjectDeployments(filters: ProjectFilters = {}) {
  const { activeOrg } = useAuth();
  const normalized = compact(filters as Record<string, unknown>);
  return useQuery({
    queryKey: projectKeys.deployments(activeOrg?.id ?? null, normalized),
    queryFn: async () => unwrapProjectList(await projectsAPI.listDeployments(normalized)),
    enabled: Boolean(activeOrg),
    staleTime: 30_000,
  });
}

export function useProjectDeployment(id: number | null) {
  const { activeOrg } = useAuth();
  return useQuery({
    queryKey: projectKeys.detail(activeOrg?.id ?? null, id),
    queryFn: () => projectsAPI.getDeployment(id as number),
    enabled: Boolean(activeOrg && id),
  });
}

export function useProjectRelated(id: number | null) {
  const { activeOrg } = useAuth();
  const organizationId = activeOrg?.id ?? null;
  const enabled = Boolean(organizationId && id);
  const participants = useQuery({
    queryKey: projectKeys.related(organizationId, id, 'participants'),
    queryFn: () => projectsAPI.participants(id as number),
    enabled,
  });
  const groups = useQuery({
    queryKey: projectKeys.related(organizationId, id, 'groups'),
    queryFn: async () => unwrapProjectList(await projectsAPI.groups(id as number)),
    enabled,
  });
  const evidence = useQuery({
    queryKey: projectKeys.related(organizationId, id, 'evidence'),
    queryFn: async () => unwrapProjectList(await projectsAPI.evidence(id as number)),
    enabled,
  });
  const evaluations = useQuery({
    queryKey: projectKeys.related(organizationId, id, 'evaluations'),
    queryFn: async () => unwrapProjectList(await projectsAPI.evaluations(id as number)),
    enabled,
  });
  const results = useQuery({
    queryKey: projectKeys.related(organizationId, id, 'results'),
    queryFn: () => projectsAPI.results(id as number),
    enabled,
  });
  const checklist = useQuery({
    queryKey: projectKeys.related(organizationId, id, 'checklist'),
    queryFn: () => projectsAPI.checklist(id as number),
    enabled,
  });
  const eligible = useQuery({
    queryKey: projectKeys.related(organizationId, id, 'eligible'),
    queryFn: () => projectsAPI.eligibleLateParticipants(id as number),
    enabled,
  });
  return { participants, groups, evidence, evaluations, results, checklist, eligible };
}

export function useProjectAction(deploymentId: number) {
  const { activeOrg } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      action,
      payload,
    }: {
      action: 'publish' | 'start' | 'complete' | 'finalize' | 'cancel';
      payload?: Record<string, unknown>;
    }) => projectsAPI.deploymentAction(deploymentId, action, payload),
    onSettled: async (_data, error) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(activeOrg?.id ?? null, deploymentId),
        }),
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
      ]);
      // Lifecycle conflicts deliberately refresh canonical state before the UI explains the error.
      void error;
    },
  });
}

export function useProjectCatalogue(filters: Record<string, unknown> = {}) {
  const { activeOrg } = useAuth();
  const normalized = compact(filters);
  return useQuery({
    queryKey: projectKeys.catalogue(activeOrg?.id ?? null, normalized),
    queryFn: async () => unwrapProjectList(await projectsAPI.catalogue(normalized)),
    enabled: Boolean(activeOrg),
  });
}

export function useProjectImports() {
  const { activeOrg } = useAuth();
  return useQuery({
    queryKey: projectKeys.imports(activeOrg?.id ?? null),
    queryFn: async () => unwrapProjectList(await projectsAPI.imports()),
    enabled: Boolean(activeOrg),
  });
}

export function useProjectMutationInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: projectKeys.all });
}

export function useProjectResourceMutations(deploymentId: number) {
  const invalidate = useProjectMutationInvalidation();
  const options = { onSettled: () => invalidate() };
  return {
    addParticipant: useMutation({
      mutationFn: (subjectEnrollment: number) =>
        projectsAPI.addLateParticipant(deploymentId, subjectEnrollment),
      ...options,
    }),
    withdrawParticipant: useMutation({
      mutationFn: (participant: number) =>
        projectsAPI.withdrawParticipant(deploymentId, participant),
      ...options,
    }),
    createGroup: useMutation({
      mutationFn: (name: string) => projectsAPI.createGroup(deploymentId, name),
      ...options,
    }),
    updateChecklist: useMutation({
      mutationFn: ({ item, completed }: { item: number; completed: boolean }) =>
        projectsAPI.updateChecklist(deploymentId, item, completed),
      ...options,
    }),
    recordEvidence: useMutation({
      mutationFn: (payload: Record<string, unknown>) =>
        projectsAPI.recordEvidence({ deployment: deploymentId, ...payload }),
      ...options,
    }),
    createEvaluation: useMutation({
      mutationFn: (payload: Record<string, unknown>) =>
        projectsAPI.createEvaluation({ deployment: deploymentId, ...payload }),
      ...options,
    }),
    recordCriterionScore: useMutation({
      mutationFn: ({
        evaluation,
        criterion,
        awarded_marks,
      }: {
        evaluation: number;
        criterion: number;
        awarded_marks: string;
      }) => projectsAPI.recordCriterionScore(evaluation, { criterion, awarded_marks }),
      ...options,
    }),
    finalizeEvaluation: useMutation({
      mutationFn: (evaluation: number) => projectsAPI.finalizeEvaluation(evaluation),
      ...options,
    }),
  };
}
