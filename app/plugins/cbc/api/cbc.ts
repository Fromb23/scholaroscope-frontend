// ============================================================================
// app/plugins/cbc/api/cbc.ts
// ============================================================================
//
// Base URL assumption: apiClient.baseURL = "/api/cbc"
// Public routes  → /api/cbc/<route>/
// Admin routes   → /api/cbc/admin/<route>/
//
// All reads use the public viewset.
// All writes (create / update / delete) use the admin viewset.
// ============================================================================

import { apiClient } from '@/app/core/api/client';
import {
  Strand,
  StrandDetail,
  StrandFormData,
  SubStrand,
  SubStrandDetail,
  SubStrandFormData,
  LearningOutcome,
  LearningOutcomeFormData,
  EvidenceRecord,
  EvidenceFormData,
  BulkEvidenceData,
  StudentProgress,
  OutcomeAchievement,
  ClassProgress,
  OutcomeSession,
  OutcomeSessionWithEvidence,  // AC-4: outcomes action now returns evidence_count
  OutcomeSessionFormData,
  BulkOutcomeSessionData,
  OutcomeProgress,
  OutcomeProgressUpdateData,
  BulkOutcomeProgressData,
  StudentProgressSummary,
  CohortSummaryEntry,
  TeachingSession,
  TeachingSessionSummary,
  RubricScale,
  BulkClassEvidenceData,
} from '@/app/plugins/cbc/types/cbc';


// ============================================================================
// Strands
// ============================================================================

export const strandAPI = {
  getAll: async (params?: { curriculum?: number; subject?: number }) => {
    const response = await apiClient.get<Strand[]>('/cbc/strands/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<StrandDetail>(`/cbc/strands/${id}/`);
    return response.data;
  },

  getByCurriculum: async (curriculumId: number) => {
    const response = await apiClient.get<StrandDetail[]>('/cbc/strands/by_curriculum/', {
      params: { curriculum_id: curriculumId },
    });
    return response.data;
  },

  // Fix: was hitting /cbc/strands/by_subject/ (double-prefixed)
  getBySubject: async (subjectId: number) => {
    const response = await apiClient.get<StrandDetail[]>('/cbc/strands/by_subject/', {
      params: { subject_id: subjectId },
    });
    return response.data;
  },

  create: async (data: StrandFormData) => {
    const response = await apiClient.post<Strand>('/cbc/admin/strands/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<StrandFormData>) => {
    const response = await apiClient.patch<Strand>(`/cbc/admin/strands/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cbc/admin/strands/${id}/`);
  },
};


// ============================================================================
// Sub-Strands
// ============================================================================

export const subStrandAPI = {
  // Fix: reads were hitting /admin/sub-strands/ — reads belong on public viewset
  getAll: async (params?: { strand?: number }) => {
    const response = await apiClient.get<SubStrand[]>('/cbc/sub-strands/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<SubStrandDetail>(`/cbc/sub-strands/${id}/`);
    return response.data;
  },

  create: async (data: SubStrandFormData) => {
    const response = await apiClient.post<SubStrand>('/cbc/admin/sub-strands/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<SubStrandFormData>) => {
    const response = await apiClient.patch<SubStrand>(`/cbc/admin/sub-strands/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cbc/admin/sub-strands/${id}/`);
  },
};


// ============================================================================
// Learning Outcomes
// ============================================================================

export const learningOutcomeAPI = {
  // Fix: reads were all hitting /admin/learning-outcomes/ — reads on public viewset
  getAll: async (params?: { sub_strand?: number; level?: string; grade?: number }) => {
    const response = await apiClient.get<LearningOutcome[]>('/cbc/learning-outcomes/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<LearningOutcome>(`/cbc/learning-outcomes/${id}/`);
    return response.data;
  },

  // Fix: by_strand and by_level only exist on the public viewset, not admin
  getByStrand: async (strandId: number) => {
    const response = await apiClient.get<LearningOutcome[]>('/cbc/learning-outcomes/by_strand/', {
      params: { strand_id: strandId },
    });
    return response.data;
  },

  getByLevel: async (level: string) => {
    const response = await apiClient.get<LearningOutcome[]>('/cbc/learning-outcomes/by_level/', {
      params: { level },
    });
    return response.data;
  },

  create: async (data: LearningOutcomeFormData) => {
    const response = await apiClient.post<LearningOutcome>('/cbc/admin/learning-outcomes/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<LearningOutcomeFormData>) => {
    const response = await apiClient.patch<LearningOutcome>(
      `/cbc/admin/learning-outcomes/${id}/`,
      data,
    );
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cbc/admin/learning-outcomes/${id}/`);
  },
};


// ============================================================================
// Evidence Records
// ============================================================================

export const evidenceAPI = {
  getAll: async (params?: {
    student?: number;
    source_id?: number;
    learning_outcome?: number;
    source_type?: string;
    evaluation_type?: string;
    observed_at?: string;
  }) => {
    const response = await apiClient.get<EvidenceRecord[]>('/cbc/evidence/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<EvidenceRecord>(`/cbc/evidence/${id}/`);
    return response.data;
  },

  create: async (data: EvidenceFormData) => {
    const response = await apiClient.post<EvidenceRecord>('/cbc/evidence/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<EvidenceFormData>) => {
    const response = await apiClient.patch<EvidenceRecord>(`/cbc/evidence/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cbc/evidence/${id}/`);
  },

  bulkCreate: async (data: BulkEvidenceData) => {
    const response = await apiClient.post<{ detail: string; records: EvidenceRecord[] }>(
      '/cbc/evidence/bulk_create/',
      data,
    );
    return response.data;
  },

  getStudentProgress: async (studentId: number) => {
    const response = await apiClient.get<StudentProgress>('/cbc/evidence/student_progress/', {
      params: { student_id: studentId },
    });
    return response.data;
  },

  // Fix: was hitting /cbc/evidence/outcome_achievement/ (double-prefixed)
  getOutcomeAchievement: async (outcomeId: number) => {
    const response = await apiClient.get<OutcomeAchievement>('/cbc/evidence/outcome_achievement/', {
      params: { outcome_id: outcomeId },
    });
    return response.data;
  },

  // Fix: was hitting /cbc/evidence/class_progress/ (double-prefixed)
  getClassProgress: async (cohortId: number) => {
    const response = await apiClient.get<ClassProgress[]>('/cbc/evidence/class_progress/', {
      params: { cohort_id: cohortId },
    });
    return response.data;
  },
};


// ============================================================================
// Outcome Sessions
// ============================================================================

export const outcomeSessionAPI = {
  getAll: async (params?: {
    session?: number;
    learning_outcome?: number;
    covered?: boolean;
  }) => {
    const response = await apiClient.get<OutcomeSession[]>('/cbc/outcome-sessions/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<OutcomeSession>(`/cbc/outcome-sessions/${id}/`);
    return response.data;
  },

  bySession: async (sessionId: number) => {
    const response = await apiClient.get<OutcomeSession[]>('/cbc/outcome-sessions/by_session/', {
      params: { session_id: sessionId },
    });
    return response.data;
  },

  create: async (data: OutcomeSessionFormData) => {
    const response = await apiClient.post<OutcomeSession>('/cbc/outcome-sessions/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<OutcomeSessionFormData>) => {
    const response = await apiClient.patch<OutcomeSession>(`/cbc/outcome-sessions/${id}/`, data);
    return response.data;
  },

  markCovered: async (id: number, notes?: string) => {
    const response = await apiClient.patch<OutcomeSession>(
      `/cbc/outcome-sessions/${id}/mark_covered/`,
      { notes: notes ?? '' },
    );
    return response.data;
  },

  // Fix: payload field renamed from learning_outcome_ids → outcome_ids
  // to match BulkOutcomeSessionSerializer after our serializer patch
  bulkCreate: async (data: BulkOutcomeSessionData) => {
    const response = await apiClient.post<{ detail: string; links: OutcomeSession[] }>(
      '/cbc/outcome-sessions/bulk_create/',
      data,
    );
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cbc/outcome-sessions/${id}/`);
  },
};


// ============================================================================
// Outcome Progress
// ============================================================================

export const outcomeProgressAPI = {
  getAll: async (params?: {
    student?: number;
    learning_outcome?: number;
    mastery_level?: string;
  }) => {
    const response = await apiClient.get<OutcomeProgress[]>('/cbc/outcome-progress/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<OutcomeProgress>(`/cbc/outcome-progress/${id}/`);
    return response.data;
  },

  update: async (id: number, data: OutcomeProgressUpdateData) => {
    const response = await apiClient.patch<OutcomeProgress>(`/cbc/outcome-progress/${id}/`, data);
    return response.data;
  },

  bulkUpdate: async (data: BulkOutcomeProgressData) => {
    const response = await apiClient.post<{ detail: string; records: OutcomeProgress[] }>(
      '/cbc/outcome-progress/bulk_update/',
      data,
    );
    return response.data;
  },

  studentSummary: async (studentId: number) => {
    const response = await apiClient.get<StudentProgressSummary>(
      '/cbc/outcome-progress/student_summary/',
      { params: { student_id: studentId } },
    );
    return response.data;
  },

  cohortSummary: async (cohortId: number) => {
    const response = await apiClient.get<CohortSummaryEntry[]>(
      '/cbc/outcome-progress/cohort_summary/',
      { params: { cohort_id: cohortId } },
    );
    return response.data;
  },
};


// ============================================================================
// Teaching Sessions
// ============================================================================

export const teachingAPI = {
  getSessions: async (params?: {
    cohort?: number;
    subject?: number;
    date?: string;
  }) => {
    const response = await apiClient.get<TeachingSession[]>('/cbc/teaching-sessions/', { params });
    return response.data;
  },

  getRecentSessions: async (days: number = 30) => {
    const response = await apiClient.get<TeachingSession[]>('/cbc/teaching-sessions/recent/', {
      params: { days },
    });
    return response.data;
  },

  getTodaySessions: async () => {
    const response = await apiClient.get<TeachingSession[]>('/cbc/teaching-sessions/today/');
    return response.data;
  },

  getSession: async (sessionId: number) => {
    const response = await apiClient.get<TeachingSession>(`/cbc/teaching-sessions/${sessionId}/`);
    return response.data;
  },

  // AC-4 fix: return type updated to OutcomeSessionWithEvidence[]
  // The backend now annotates evidence_count on this queryset and uses
  // OutcomeSessionWithEvidenceSerializer — the type must reflect that.
  getSessionOutcomes: async (sessionId: number) => {
    const response = await apiClient.get<OutcomeSessionWithEvidence[]>(
      `/cbc/teaching-sessions/${sessionId}/outcomes/`,
    );
    return response.data;
  },

  getSessionLearners: async (sessionId: number) => {
    const response = await apiClient.get(`/cbc/teaching-sessions/${sessionId}/learners/`);
    return response.data;
  },

  getSessionSummary: async (sessionId: number) => {
    const response = await apiClient.get<TeachingSessionSummary>(
      `/cbc/teaching-sessions/${sessionId}/summary/`,
    );
    return response.data;
  },

  getAvailableOutcomes: async (params: { subject?: number; grade?: number }) => {
    const response = await apiClient.get<LearningOutcome[]>('/cbc/learning-outcomes/', { params });
    return response.data;
  },
};
export const rubricScaleAPI = {
  getForSession: async (sessionId: number): Promise<RubricScale> => {
    const res = await apiClient.get<RubricScale>(
      `/cbc/teaching-sessions/${sessionId}/rubric-scale/`
    );
    return res.data;
  },
};

export const bulkEvidenceAPI = {
  createForClass: async (data: BulkClassEvidenceData): Promise<{ detail: string; records: EvidenceRecord[] }> => {
    const res = await apiClient.post<{ detail: string; records: EvidenceRecord[] }>(
      '/cbc/evidence/bulk_create_class/',
      data,
    );
    return res.data;
  },
};
