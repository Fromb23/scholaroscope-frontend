// app/plugins/cbc/hooks/useCBC.ts
// React Query hooks for the CBC plugin.
// All server state is managed here — pages/components only call these hooks.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cbcKeys } from '@/app/plugins/cbc/lib/queryKeys';
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
} from '@/app/plugins/cbc/api/cbc';
import type {
  StrandFormData,
  SubStrandFormData,
  LearningOutcomeFormData,
  EvidenceFormData,
  BulkEvidenceData,
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
  OutcomeConfidence
} from '@/app/plugins/cbc/types/cbc';
import { toArray } from '@/app/plugins/cbc/lib/apiHelpers';

// ============================================================================
// Structural — Strands
// ============================================================================

export const useStrands = (params?: { curriculum?: number; subject?: number }) =>
  useQuery<Strand[]>({
    queryKey: cbcKeys.strands.list(params),
    queryFn: async () => {
      const data = await strandAPI.getAll(params);
      return toArray(data);
    },
    enabled: true,
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
    queryFn: async () => {
      const data = await strandAPI.getByCurriculum(curriculumId!);
      return toArray(data);
    },
    enabled: !!curriculumId,
    staleTime: 5 * 60 * 1000,
  });
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
    queryFn: () => learningOutcomeAPI.getById(id!),
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
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: cbcKeys.evidence.all });
      qc.invalidateQueries({
        queryKey: cbcKeys.evidence.studentProgress(created.student),
      });
      qc.invalidateQueries({ queryKey: cbcKeys.outcomeSessions.all });
    },
  });
};

export const useBulkCreateEvidence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkEvidenceData) => evidenceAPI.bulkCreate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: cbcKeys.evidence.all }),
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
    mutationFn: (id: number) => outcomeSessionAPI.delete(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: cbcKeys.outcomeSessions.all }),
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
    queryFn: () => teachingAPI.getSession(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

export const useSessionSummary = (id: number | null) =>
  useQuery({
    queryKey: cbcKeys.teachingSessions.summary(id!),
    queryFn: () => teachingAPI.getSessionSummary(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

export const useSessionLearners = (id: number | null) =>
  useQuery<SessionLearner[]>({
    queryKey: cbcKeys.teachingSessions.learners(id!),
    queryFn: () => teachingAPI.getSessionLearners(id!),
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
    mutationFn: (data: BulkClassEvidenceData) =>
      bulkEvidenceAPI.createForClass(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: cbcKeys.evidence.list({
          learning_outcome: variables.learning_outcome,
        }),
      });
      queryClient.invalidateQueries({ queryKey: cbcKeys.outcomeSessions.all }); // ← add
    },
  });
};

export const useStrandOutcomeDistribution = (params: {
  strand_id: number | null;
  cohort_id: number | null;
}) =>
  useQuery<StrandOutcomeDistribution[]>({
    queryKey: cbcKeys.outcomeProgress.strandDistribution(
      params.strand_id!,
      params.cohort_id!,
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