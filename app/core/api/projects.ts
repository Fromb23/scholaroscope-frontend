import { apiClient } from './client';
import type { PaginatedResponse } from '@/app/core/types/api';
import type {
  ProjectChecklistItem,
  ProjectClassObservation,
  CreateProjectDeploymentPayload,
  ProjectDefinitionVersion,
  ProjectDeployment,
  ProjectEvidence,
  ProjectFilters,
  ProjectGroup,
  ProjectImportJob,
  ProjectParticipant,
  ProjectResultSummary,
  ProjectTaskEvaluation,
} from '@/app/core/types/projects';

export type ProjectListResponse<T> = T[] | PaginatedResponse<T>;

export const projectsAPI = {
  listDeployments: async (params?: ProjectFilters) =>
    (
      await apiClient.get<ProjectListResponse<ProjectDeployment>>('/project-deployments/', {
        params,
      })
    ).data,
  getDeployment: async (id: number) =>
    (await apiClient.get<ProjectDeployment>(`/project-deployments/${id}/`)).data,
  createDeployment: async (payload: CreateProjectDeploymentPayload) =>
    (await apiClient.post<ProjectDeployment>('/project-deployments/', payload)).data,
  deploymentAction: async (
    id: number,
    action: 'publish' | 'start' | 'complete' | 'finalize' | 'cancel',
    payload: Record<string, unknown> = {},
  ) =>
    (await apiClient.post<ProjectDeployment>(`/project-deployments/${id}/${action}/`, payload))
      .data,
  participants: async (id: number) =>
    (await apiClient.get<ProjectParticipant[]>(`/project-deployments/${id}/participants/`)).data,
  eligibleLateParticipants: async (id: number) =>
    (
      await apiClient.get<
        Array<{ subject_enrollment: number; learner: number; learner_name: string }>
      >(`/project-deployments/${id}/eligible-late-participants/`)
    ).data,
  addLateParticipant: async (id: number, subjectEnrollment: number) =>
    (
      await apiClient.post<ProjectParticipant>(
        `/project-deployments/${id}/participants/add-late/`,
        { subject_enrollment: subjectEnrollment },
      )
    ).data,
  withdrawParticipant: async (id: number, participant: number) =>
    (
      await apiClient.post<ProjectParticipant>(
        `/project-deployments/${id}/participants/withdraw/`,
        { participant },
      )
    ).data,
  checklist: async (id: number) =>
    (
      await apiClient.get<ProjectChecklistItem[]>(
        `/project-deployments/${id}/administration-checklist/`,
      )
    ).data,
  updateChecklist: async (id: number, item: number, completed: boolean) =>
    (
      await apiClient.post<ProjectChecklistItem[]>(
        `/project-deployments/${id}/administration-checklist/`,
        { item, completed },
      )
    ).data,
  results: async (id: number) =>
    (await apiClient.get<ProjectResultSummary[]>(`/project-deployments/${id}/result-summaries/`))
      .data,
  groups: async (deployment: number) =>
    (
      await apiClient.get<ProjectListResponse<ProjectGroup>>('/project-groups/', {
        params: { deployment },
      })
    ).data,
  createGroup: async (deployment: number, name: string) =>
    (await apiClient.post<ProjectGroup>('/project-groups/', { deployment, name })).data,
  addGroupMember: async (group: number, participant: number, role = '') =>
    (await apiClient.post(`/project-groups/${group}/members/`, { participant, role })).data,
  evidence: async (deployment: number) =>
    (
      await apiClient.get<ProjectListResponse<ProjectEvidence>>('/project-evidence/', {
        params: { deployment },
      })
    ).data,
  recordEvidence: async (payload: Record<string, unknown>) =>
    (await apiClient.post<ProjectEvidence>('/project-evidence/', payload)).data,
  evaluations: async (deployment: number) =>
    (
      await apiClient.get<ProjectListResponse<ProjectTaskEvaluation>>(
        '/project-task-evaluations/',
        { params: { deployment } },
      )
    ).data,
  createEvaluation: async (payload: Record<string, unknown>) =>
    (await apiClient.post<ProjectTaskEvaluation>('/project-task-evaluations/', payload)).data,
  recordCriterionScore: async (
    evaluation: number,
    payload: {
      criterion: number;
      awarded_marks: string;
      feedback?: string;
      evidence_ids?: number[];
    },
  ) =>
    (await apiClient.post(`/project-task-evaluations/${evaluation}/criterion-scores/`, payload))
      .data,
  finalizeEvaluation: async (evaluation: number) =>
    (
      await apiClient.post<ProjectTaskEvaluation>(
        `/project-task-evaluations/${evaluation}/finalize/`,
      )
    ).data,
  classObservations: async (deployment: number) =>
    (
      await apiClient.get<ProjectListResponse<ProjectClassObservation>>(
        '/project-class-observations/',
        { params: { deployment } },
      )
    ).data,
  createClassObservation: async (payload: {
    deployment: number;
    task?: number;
    comment: string;
    observed_at: string;
    supersedes?: number;
    amendment_reason?: string;
  }) =>
    (await apiClient.post<ProjectClassObservation>('/project-class-observations/', payload)).data,
  finalizeClassObservation: async (id: number) =>
    (
      await apiClient.post<ProjectClassObservation>(
        `/project-class-observations/${id}/finalize/`,
      )
    ).data,
  catalogue: async (params?: Record<string, unknown>) =>
    (
      await apiClient.get<ProjectListResponse<ProjectDefinitionVersion>>('/project-catalogue/', {
        params,
      })
    ).data,
  curriculumMappings: async (definitionVersion: number, cohortSubject: number) =>
    (
      await apiClient.get<{
        definition: ProjectDefinitionVersion;
        outcomes: Array<{ id: number; code: string; description: string }>;
      }>(`/project-catalogue/${definitionVersion}/curriculum-mappings/`, {
        params: { cohort_subject: cohortSubject },
      })
    ).data,
  updateCurriculumMappings: async (
    definitionVersion: number,
    payload: {
      cohort_subject: number;
      tasks: Array<{ task: number; learning_outcome: number }>;
      criteria: Array<{ criterion: number; learning_outcome: number }>;
    },
  ) =>
    (
      await apiClient.post<{
        definition: ProjectDefinitionVersion;
        outcomes: Array<{ id: number; code: string; description: string }>;
      }>(`/project-catalogue/${definitionVersion}/curriculum-mappings/`, payload)
    ).data,
  adoptDefinition: async (definitionVersion: number, decision = 'VERIFIED') =>
    (
      await apiClient.post('/project-adoptions/', {
        definition_version: definitionVersion,
        decision,
      })
    ).data,
  imports: async () =>
    (await apiClient.get<ProjectListResponse<ProjectImportJob>>('/project-sources/')).data,
  uploadImport: async (form: FormData) =>
    (
      await apiClient.post<ProjectImportJob>('/project-sources/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data,
  confirmImport: async (
    id: number,
    organizationCohortSubject: number,
    semanticDuplicateDecision = '',
  ) =>
    (
      await apiClient.post(`/project-sources/${id}/confirm-extraction/`, {
        semantic_duplicate_decision: semanticDuplicateDecision,
        organization_cohort_subject: organizationCohortSubject,
      })
    ).data,
  rejectImport: async (id: number, reason: string) =>
    (
      await apiClient.post<ProjectImportJob>(`/project-sources/${id}/reject-extraction/`, {
        reason,
      })
    ).data,
};

export function unwrapProjectList<T>(response: ProjectListResponse<T>): T[] {
  return Array.isArray(response) ? response : (response.results ?? []);
}
