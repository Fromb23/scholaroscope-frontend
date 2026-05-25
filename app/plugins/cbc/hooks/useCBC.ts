// app/plugins/cbc/hooks/useCBC.ts
// React Query hooks for the CBC plugin.
// All server state is managed here — pages/components only call these hooks.

import type { AxiosError } from 'axios';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { cbcKeys } from '@/app/plugins/cbc/lib/queryKeys';
import { apiClient } from '@/app/core/api/client';
import { isEvidenceEligible } from '@/app/plugins/cbc/lib/evidenceEligibility';
import {
  strandAPI,
  subStrandAPI,
  learningOutcomeAPI,
  evidenceAPI,
  outcomeSessionAPI,
  outcomeProgressAPI,
  teachingAPI,
  bulkEvidenceAPI,
  rubricScaleAPI,
  cbcCatalogAPI,
} from '@/app/plugins/cbc/api/cbc';
import type {
  StrandFormData,
  SubStrandFormData,
  LearningOutcomeFormData,
  EvidenceFormData,
  BulkOutcomeSessionData,
  BulkOutcomeProgressData,
  SessionLearner,
  Strand,
  SubStrand,
  LearningOutcome,
  StrandDetail,
  TeachingSession,
  EvidenceRecord,
  BulkClassEvidenceData,
  RubricScale,
  CompetencyDistribution,
  CBCProgressSummary,
  StrandOutcomeDistribution,
  OutcomeLearner,
  OutcomeConfidence,
  CBCCatalog,
} from '@/app/plugins/cbc/types/cbc';
import { toArray } from '@/app/plugins/cbc/lib/apiHelpers';

function uniqueSortedIds(values: number[]) {
  return Array.from(new Set(values))
    .filter(value => Number.isFinite(value))
    .sort((left, right) => left - right);
}

interface CBCRequestDiagnostics {
  endpoint: string;
  url: string;
  params?: Record<string, number | string | null | undefined>;
  statusCode?: number;
  backendDetail?: string;
  backendMessage?: string;
  responseData?: unknown;
}

export interface CBCQueryError extends Error {
  response?: {
    status?: number;
    data?: unknown;
  };
  diagnostic?: CBCRequestDiagnostics;
}

function buildRequestUrl(endpoint: string, params?: Record<string, number | string | null | undefined>) {
  const baseURL = apiClient.defaults.baseURL ?? '';
  const normalizedBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${normalizedBaseURL}${normalizedEndpoint}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

function extractBackendMessage(responseData: unknown) {
  if (typeof responseData === 'string') {
    return {
      backendDetail: responseData,
      backendMessage: responseData,
    };
  }

  if (!responseData || typeof responseData !== 'object') return {};

  const payload = responseData as {
    detail?: string;
    message?: string;
    error?: string;
    non_field_errors?: string[];
  };

  return {
    backendDetail: payload.detail ?? payload.non_field_errors?.[0],
    backendMessage: payload.message ?? payload.error,
  };
}

function flattenErrorMessages(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.flatMap(item => flattenErrorMessages(item));
  }
  if (!value || typeof value !== 'object') return [];

  return Object.values(value).flatMap(item => flattenErrorMessages(item));
}

function isUnmarkedAttendanceBulkEvidenceError(error: unknown): boolean {
  const axiosError = error as AxiosError;

  if (axiosError.response?.status !== 400) {
    return false;
  }

  const messages = flattenErrorMessages(axiosError.response?.data)
    .map(message => message.toLowerCase());

  return messages.some(message => (
    message.includes('attendance') &&
    (
      message.includes('unmarked') ||
      message.includes('must be marked') ||
      message.includes('mark attendance')
    )
  ));
}

function decorateCBCQueryError(
  error: unknown,
  endpoint: string,
  params?: Record<string, number | string | null | undefined>
): CBCQueryError {
  const axiosError = error as AxiosError;
  const decorated = error instanceof Error ? error as CBCQueryError : new Error('CBC request failed') as CBCQueryError;
  const responseData = axiosError.response?.data;

  decorated.diagnostic = {
    endpoint,
    url: buildRequestUrl(endpoint, params),
    params,
    statusCode: axiosError.response?.status,
    ...extractBackendMessage(responseData),
    responseData,
  };

  return decorated;
}

async function runCBCQuery<T>(
  request: () => Promise<T>,
  endpoint: string,
  params?: Record<string, number | string | null | undefined>
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    throw decorateCBCQueryError(error, endpoint, params);
  }
}

function getEligibleSessionLearnerIds(
  queryClient: QueryClient,
  sessionId: number,
) {
  const learners = queryClient.getQueryData<SessionLearner[]>(
    cbcKeys.teachingSessions.learners(sessionId),
  ) ?? [];

  return learners
    .filter(learner => isEvidenceEligible(learner.attendance_status))
    .map(learner => learner.id);
}

// ============================================================================
// Structural — Strands
// ============================================================================

export const useStrands = (params?: { curriculum?: number; subject?: number; subject_profile?: number }) =>
  useQuery<Strand[]>({
    queryKey: cbcKeys.strands.list(params),
    queryFn: async () => {
      try {
        const data = await strandAPI.getAll(params);
        return toArray(data);
      } catch (error) {
        const decorated = decorateCBCQueryError(error, '/cbc/strands/', params);
        console.error('[CBC Browser] strand fetch failed', {
          endpointUrl: decorated.diagnostic?.url ?? decorated.diagnostic?.endpoint ?? null,
          queryParams: decorated.diagnostic?.params ?? params ?? null,
          statusCode: decorated.diagnostic?.statusCode ?? null,
          backendDetail: decorated.diagnostic?.backendDetail ?? null,
          backendMessage: decorated.diagnostic?.backendMessage ?? null,
          responseData: decorated.diagnostic?.responseData ?? null,
          finalUseStrandsParams: params ?? null,
        });
        throw decorated;
      }
    },
    enabled: params !== undefined,
    staleTime: 5 * 60 * 1000,
  });

export const useStrandDetail = (id: number | null) =>
  useQuery({
    queryKey: cbcKeys.strands.detail(id!),
    queryFn: () => strandAPI.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

export const useStrandsByCurriculum = (curriculumId: number | null) =>
  useQuery<StrandDetail[]>({
    queryKey: cbcKeys.strands.byCurriculum(curriculumId!),
    queryFn: () => strandAPI.getByCurriculum(curriculumId!),
    enabled: !!curriculumId,
    staleTime: 5 * 60 * 1000,
  });

export const useStrandsBySubject = (subjectId: number | null) =>
  useQuery<StrandDetail[]>({
    queryKey: ['cbc', 'strands', 'by-subject', subjectId],
    queryFn: () => strandAPI.getBySubject(subjectId!),
    enabled: !!subjectId,
    staleTime: 5 * 60 * 1000,
  });

export const useCBCCatalog = () =>
  useQuery<CBCCatalog>({
    queryKey: cbcKeys.catalog.detail,
    queryFn: () => cbcCatalogAPI.getCatalog(),
    staleTime: 5 * 60 * 1000,
  });

export const useStrandsBySubjectProfiles = (params: {
  curriculumId: number | null;
  subjectProfileIds: number[];
}) => {
  const profileIds = uniqueSortedIds(params.subjectProfileIds);

  return useQuery<Strand[]>({
    queryKey: cbcKeys.strands.byProfiles(params.curriculumId ?? 0, profileIds),
    queryFn: async () => {
      const strands = toArray(await strandAPI.getAll({ curriculum: params.curriculumId! }));

      return strands
        .filter(strand => (
          typeof strand.subject_profile_id === 'number' &&
          profileIds.includes(strand.subject_profile_id)
        ))
        .map(strand => ({
          ...strand,
          subject_profile_id: strand.subject_profile_id ?? null,
        }));
    },
    enabled: Boolean(params.curriculumId) && profileIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

export const useStrandDetailsBySubjectProfiles = (params: {
  curriculumId: number | null;
  subjectProfileIds: number[];
}) => {
  const profileIds = uniqueSortedIds(params.subjectProfileIds);

  return useQuery<StrandDetail[]>({
    queryKey: cbcKeys.strands.detailByProfiles(params.curriculumId ?? 0, profileIds),
    queryFn: async () => {
      const results = await Promise.all(
        profileIds.map(profileId =>
          strandAPI.getAll({ subject_profile: profileId })
        )
      );

      const byId = new Map<number, StrandDetail>();

      results.flatMap(toArray).forEach(strand => {
        byId.set(strand.id, {
          ...(strand as StrandDetail),
          sub_strands: (strand as StrandDetail).sub_strands ?? [],
        });
      });

      return Array.from(byId.values()).sort((a, b) => {
        return (a.sequence ?? 0) - (b.sequence ?? 0) || a.name.localeCompare(b.name);
      });
    },
    enabled: profileIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateStrand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StrandFormData) => strandAPI.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: cbcKeys.strands.all }),
  });
};

export const useUpdateStrand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StrandFormData> }) =>
      strandAPI.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: cbcKeys.strands.all });
      qc.invalidateQueries({ queryKey: cbcKeys.strands.detail(id) });
    },
  });
};

export const useDeleteStrand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => strandAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: cbcKeys.strands.all }),
  });
};

// ============================================================================
// Structural — SubStrands
// ============================================================================

export const useSubStrands = (strandId?: number) =>
  useQuery<SubStrand[]>({
    queryKey: cbcKeys.subStrands.list(strandId),
    queryFn: async () => {
      const data = await subStrandAPI.getAll(strandId ? { strand: strandId } : undefined);
      return toArray(data);
    },
    enabled: !!strandId,
    staleTime: 5 * 60 * 1000,
  });

export const useSubStrandDetail = (id: number | null) =>
  useQuery({
    queryKey: cbcKeys.subStrands.detail(id!),
    queryFn: () => subStrandAPI.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

export const useCreateSubStrand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubStrandFormData) => subStrandAPI.create(data),
    onSuccess: (_, { strand }) => {
      qc.invalidateQueries({ queryKey: cbcKeys.subStrands.list(strand) });
      qc.invalidateQueries({ queryKey: cbcKeys.strands.all });
    },
  });
};

export const useUpdateSubStrand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SubStrandFormData> }) =>
      subStrandAPI.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: cbcKeys.subStrands.list(updated.strand) });
      qc.invalidateQueries({ queryKey: cbcKeys.subStrands.detail(updated.id) });
    },
  });
};

export const useDeleteSubStrand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subStrandAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: cbcKeys.subStrands.all }),
  });
};

// ============================================================================
// Structural — Learning Outcomes
// ============================================================================

export const useLearningOutcomes = (params?: { sub_strand?: number; level?: string }) =>
  useQuery<LearningOutcome[]>({
    queryKey: cbcKeys.outcomes.list(params),
    queryFn: async () => {
      const data = await learningOutcomeAPI.getAll(params);
      return toArray(data);
    },
    enabled: !!params?.sub_strand,
    staleTime: 5 * 60 * 1000,
  });

export const useLearningOutcomeDetail = (id: number | null) =>
  useQuery<LearningOutcome>({
    queryKey: cbcKeys.outcomes.detail(id!),
    queryFn: () => runCBCQuery(
      () => learningOutcomeAPI.getById(id!),
      `/cbc/learning-outcomes/${id!}/`,
    ),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

export const useOutcomesByStrand = (strandId: number | null) =>
  useQuery({
    queryKey: cbcKeys.outcomes.byStrand(strandId!),
    queryFn: () => learningOutcomeAPI.getByStrand(strandId!),
    enabled: !!strandId,
    staleTime: 5 * 60 * 1000,
  });

export const useCreateOutcome = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LearningOutcomeFormData) => learningOutcomeAPI.create(data),
    onSuccess: (_, { sub_strand }) => {
      qc.invalidateQueries({ queryKey: cbcKeys.outcomes.list({ sub_strand }) });
      qc.invalidateQueries({ queryKey: cbcKeys.subStrands.all });
    },
  });
};

export const useUpdateOutcome = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LearningOutcomeFormData> }) =>
      learningOutcomeAPI.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: cbcKeys.outcomes.list({ sub_strand: updated.sub_strand }) });
      qc.invalidateQueries({ queryKey: cbcKeys.outcomes.detail(updated.id) });
    },
  });
};

export const useDeleteOutcome = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => learningOutcomeAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: cbcKeys.outcomes.all }),
  });
};

// ============================================================================
// Evidence
// ============================================================================

type ApiList<T> = T[] | { results: T[]; count: number };

// Updated useEvidence
export const useEvidence = (params?: {
  student?: number;
  learning_outcome?: number;
  source_type?: string;
  source_id?: number;
}) =>
  useQuery<EvidenceRecord[]>({
    queryKey: cbcKeys.evidence.list(params),
    queryFn: async (): Promise<EvidenceRecord[]> => {
      const data = await evidenceAPI.getAll(params) as ApiList<EvidenceRecord>;
      return toArray(data);
    },
    enabled: !!(params?.student || params?.learning_outcome),
    staleTime: 2 * 60 * 1000,
  });

export const useEvidenceBySessionOutcome = (
  sessionId: number | null,
  learningOutcomeId: number | null,
) =>
  useQuery<EvidenceRecord[]>({
    queryKey: cbcKeys.evidence.bySessionOutcome(sessionId!, learningOutcomeId!),
    queryFn: () => runCBCQuery(
      () => evidenceAPI.getBySessionOutcome({
        sessionId: sessionId!,
        learningOutcomeId: learningOutcomeId!,
      }),
      '/cbc/evidence/by_session_outcome/',
      {
        session_id: sessionId!,
        learning_outcome_id: learningOutcomeId!,
      },
    ),
    enabled: sessionId !== null && learningOutcomeId !== null,
    staleTime: 2 * 60 * 1000,
  });

export const useStudentProgress = (studentId: number | null) =>
  useQuery({
    queryKey: cbcKeys.evidence.studentProgress(studentId!),
    queryFn: () => evidenceAPI.getStudentProgress(studentId!),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });

export const useClassProgress = (cohortId: number | null) =>
  useQuery({
    queryKey: cbcKeys.evidence.classProgress(cohortId!),
    queryFn: () => evidenceAPI.getClassProgress(cohortId!),
    enabled: !!cohortId,
    staleTime: 2 * 60 * 1000,
  });

export const useCreateEvidence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EvidenceFormData) => evidenceAPI.create(data),
    onSuccess: (created, variables) => {
      const isSessionEvidence =
        variables.source_type === 'SESSION' &&
        typeof variables.source_id === 'number';

      if (isSessionEvidence) {
        qc.invalidateQueries({
          queryKey: cbcKeys.evidence.bySessionOutcome(
            variables.source_id!,
            variables.learning_outcome,
          ),
        });
        qc.invalidateQueries({
          queryKey: cbcKeys.outcomeSessions.bySession(variables.source_id!),
        });
        qc.invalidateQueries({
          queryKey: cbcKeys.teachingSessions.summary(variables.source_id!),
        });
        qc.invalidateQueries({
          queryKey: cbcKeys.teachingSessions.outcomes(variables.source_id!),
        });
        qc.invalidateQueries({
          queryKey: cbcKeys.teachingSessions.learners(variables.source_id!),
        });
      } else {
        qc.invalidateQueries({ queryKey: cbcKeys.evidence.all });
      }

      qc.invalidateQueries({
        queryKey: cbcKeys.evidence.studentProgress(created.student),
      });
      qc.invalidateQueries({
        queryKey: cbcKeys.evidence.studentConfidence(created.student),
      });
      qc.invalidateQueries({
        queryKey: cbcKeys.evidence.outcomeAchievement(created.learning_outcome),
      });
      qc.invalidateQueries({
        queryKey: cbcKeys.outcomeProgress.student(created.student),
      });
      qc.invalidateQueries({
        queryKey: cbcKeys.outcomeProgress.studentSummary(created.student),
      });
      qc.invalidateQueries({
        predicate: query => (
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'cbc' &&
          query.queryKey[1] === 'outcome-progress' &&
          (query.queryKey[2] === 'distribution' || query.queryKey[2] === 'learners') &&
          query.queryKey[3] === created.learning_outcome
        ),
      });
    },
  });
};

// ============================================================================
// OutcomeSessions
// ============================================================================

export const useOutcomeSessions = (sessionId: number | null) =>
  useQuery({
    queryKey: cbcKeys.outcomeSessions.bySession(sessionId!),
    queryFn: () => outcomeSessionAPI.bySession(sessionId!),
    enabled: !!sessionId,
    staleTime: 0,
  });

export const useBulkTagOutcomes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkOutcomeSessionData) => outcomeSessionAPI.bulkCreate(data),
    onSuccess: (_, { session }) => {
      qc.invalidateQueries({ queryKey: cbcKeys.outcomeSessions.bySession(session) });
      qc.invalidateQueries({ queryKey: cbcKeys.teachingSessions.summary(session) });
    },
  });
};

export const useMarkOutcomeCovered = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      outcomeSessionAPI.markCovered(id, notes),
    onSuccess: (updated) => {
      qc.invalidateQueries({
        queryKey: cbcKeys.outcomeSessions.bySession(updated.session),
      });
    },
  });
};

export const useRemoveOutcomeLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; sessionId: number }) => outcomeSessionAPI.delete(id),
    onSuccess: (_data, { sessionId }) => {
      qc.invalidateQueries({ queryKey: cbcKeys.outcomeSessions.bySession(sessionId) });
      qc.invalidateQueries({ queryKey: cbcKeys.teachingSessions.outcomes(sessionId) });
      qc.invalidateQueries({ queryKey: cbcKeys.teachingSessions.summary(sessionId) });
    },
  });
};

// ============================================================================
// OutcomeProgress
// ============================================================================

export const useOutcomeProgress = (studentId: number | null) =>
  useQuery({
    queryKey: cbcKeys.outcomeProgress.student(studentId!),
    queryFn: () => outcomeProgressAPI.getAll({ student: studentId! }),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });

export const useOutcomeProgressSummary = (studentId: number | null) =>
  useQuery({
    queryKey: cbcKeys.outcomeProgress.studentSummary(studentId!),
    queryFn: () => outcomeProgressAPI.studentSummary(studentId!),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });

export const useCohortSummary = (cohortId: number | null) =>
  useQuery({
    queryKey: cbcKeys.outcomeProgress.cohortSummary(cohortId!),
    queryFn: () => outcomeProgressAPI.cohortSummary(cohortId!),
    enabled: !!cohortId,
    staleTime: 2 * 60 * 1000,
  });

export const useCBCProgressSummary = (params: {
  cohort_id: number | null;
  subject_id: number | null;
}) =>
  useQuery<CBCProgressSummary>({
    queryKey: cbcKeys.outcomeProgress.cbcSummary(params.cohort_id!, params.subject_id!),
    queryFn: () =>
      outcomeProgressAPI.cbcProgressSummary({
        cohort_id: params.cohort_id!,
        subject_id: params.subject_id!,
      }),
    enabled: !!params.cohort_id && !!params.subject_id,
    staleTime: 2 * 60 * 1000,
  });

export const useOutcomeDistribution = (params: {
  learning_outcome_id: number | null;
  cohort_id: number | null;
}) =>
  useQuery<CompetencyDistribution>({
    queryKey: cbcKeys.outcomeProgress.distribution(
      params.learning_outcome_id!,
      params.cohort_id!,
    ),
    queryFn: () =>
      outcomeProgressAPI.outcomeDistribution({
        learning_outcome_id: params.learning_outcome_id!,
        cohort_id: params.cohort_id!,
      }),
    enabled: !!params.learning_outcome_id && !!params.cohort_id,
    staleTime: 2 * 60 * 1000,
  });

export const useBulkUpdateProgress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkOutcomeProgressData) => outcomeProgressAPI.bulkUpdate(data),
    onSuccess: (_, { student }) => {
      qc.invalidateQueries({ queryKey: cbcKeys.outcomeProgress.student(student) });
      qc.invalidateQueries({ queryKey: cbcKeys.outcomeProgress.studentSummary(student) });
    },
  });
};

// ============================================================================
// Teaching Sessions
// ============================================================================

export const useTeachingSessions = (params?: { cohort?: number; subject?: number }) =>
  useQuery<TeachingSession[]>({
    queryKey: cbcKeys.teachingSessions.list(params),
    queryFn: async () => {
      const data = await teachingAPI.getSessions(params);
      return toArray(data);
    },
    staleTime: 2 * 60 * 1000,
  });

export const useTodaySessions = () =>
  useQuery<TeachingSession[]>({
    queryKey: cbcKeys.teachingSessions.today,
    queryFn: async () => {
      const data = await teachingAPI.getTodaySessions();
      return toArray(data);
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useRecentSessions = (days = 7) =>
  useQuery<TeachingSession[]>({
    queryKey: cbcKeys.teachingSessions.recent(days),
    queryFn: async () => {
      const data = await teachingAPI.getRecentSessions(days);
      return toArray(data);
    },
    staleTime: 2 * 60 * 1000,
  });

export const useTeachingSession = (id: number | null) =>
  useQuery({
    queryKey: cbcKeys.teachingSessions.detail(id!),
    queryFn: () => runCBCQuery(
      () => teachingAPI.getSession(id!),
      `/cbc/teaching-sessions/${id!}/`,
    ),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

export const useSessionSummary = (id: number | null) =>
  useQuery({
    queryKey: cbcKeys.teachingSessions.summary(id!),
    queryFn: () => runCBCQuery(
      () => teachingAPI.getSessionSummary(id!),
      `/cbc/teaching-sessions/${id!}/summary/`,
    ),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

export const useSessionLearners = (id: number | null) =>
  useQuery<SessionLearner[]>({
    queryKey: cbcKeys.teachingSessions.learners(id!),
    queryFn: () => runCBCQuery(
      () => teachingAPI.getSessionLearners(id!),
      `/cbc/teaching-sessions/${id!}/learners/`,
    ),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

export const useSessionOutcomes = (id: number | null) =>
  useQuery({
    queryKey: cbcKeys.teachingSessions.outcomes(id!),
    queryFn: () => teachingAPI.getSessionOutcomes(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

export const useSessionRubricScale = (sessionId: number | null) =>
  useQuery<RubricScale>({
    queryKey: cbcKeys.rubricScale.forSession(sessionId!),
    queryFn: () => rubricScaleAPI.getForSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 10 * 60 * 1000,
  });

export const useBulkCreateClassEvidence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BulkClassEvidenceData) => {
      try {
        return await bulkEvidenceAPI.createForClass(data);
      } catch (error) {
        if (isUnmarkedAttendanceBulkEvidenceError(error)) {
          throw new Error('Attendance must be marked before recording class evidence.');
        }

        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      const eligibleLearnerIds = getEligibleSessionLearnerIds(
        queryClient,
        variables.session_id,
      );

      queryClient.invalidateQueries({
        queryKey: cbcKeys.evidence.bySessionOutcome(
          variables.session_id,
          variables.learning_outcome,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: cbcKeys.outcomeSessions.bySession(variables.session_id),
      });
      queryClient.invalidateQueries({
        queryKey: cbcKeys.teachingSessions.summary(variables.session_id),
      });
      queryClient.invalidateQueries({
        queryKey: cbcKeys.teachingSessions.outcomes(variables.session_id),
      });
      queryClient.invalidateQueries({
        queryKey: cbcKeys.teachingSessions.learners(variables.session_id),
      });
      queryClient.invalidateQueries({
        queryKey: cbcKeys.evidence.outcomeAchievement(variables.learning_outcome),
      });
      queryClient.invalidateQueries({
        predicate: query => (
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'cbc' &&
          query.queryKey[1] === 'outcome-progress' &&
          (query.queryKey[2] === 'distribution' || query.queryKey[2] === 'learners') &&
          query.queryKey[3] === variables.learning_outcome
        ),
      });

      eligibleLearnerIds.forEach(studentId => {
        queryClient.invalidateQueries({
          queryKey: cbcKeys.evidence.studentProgress(studentId),
        });
        queryClient.invalidateQueries({
          queryKey: cbcKeys.evidence.studentConfidence(studentId),
        });
        queryClient.invalidateQueries({
          queryKey: cbcKeys.outcomeProgress.student(studentId),
        });
        queryClient.invalidateQueries({
          queryKey: cbcKeys.outcomeProgress.studentSummary(studentId),
        });
      });
    },
  });
};

export const useStrandOutcomeDistribution = (params: {
  strand_id: number | null;
  cohort_id: number | null;
  subject_id?: number | null;
}) =>
  useQuery<StrandOutcomeDistribution[]>({
    queryKey: cbcKeys.outcomeProgress.strandDistribution(
      params.strand_id!,
      params.cohort_id!,
      params.subject_id,
    ),
    queryFn: () =>
      outcomeProgressAPI.strandOutcomeDistribution({
        strand_id: params.strand_id!,
        cohort_id: params.cohort_id!,
      }),
    enabled: !!params.strand_id && !!params.cohort_id,
    staleTime: 2 * 60 * 1000,
  });

export const useOutcomeLearners = (params: {
  learning_outcome_id: number | null;
  cohort_id: number | null;
  levels?: string;
}) =>
  useQuery<OutcomeLearner[]>({
    queryKey: cbcKeys.outcomeProgress.outcomeLearners(
      params.learning_outcome_id!,
      params.cohort_id!,
      params.levels,
    ),
    queryFn: () =>
      outcomeProgressAPI.outcomeLearners({
        learning_outcome_id: params.learning_outcome_id!,
        cohort_id: params.cohort_id!,
        levels: params.levels,
      }),
    enabled: !!params.learning_outcome_id && !!params.cohort_id,
    staleTime: 2 * 60 * 1000,
  });

export const useStudentConfidence = (studentId: number | null) =>
  useQuery<OutcomeConfidence[]>({
    queryKey: cbcKeys.evidence.studentConfidence(studentId!),
    queryFn: () => evidenceAPI.studentConfidence(studentId!),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });
