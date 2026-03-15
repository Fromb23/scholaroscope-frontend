// ============================================================================
// app/api/cbc.ts - CBC API Calls
// ============================================================================

import { apiClient } from '@/app/core/api/client';
import {
  Strand, StrandDetail,
  SubStrand, SubStrandDetail,
  LearningOutcome,
  StrandFormData, SubStrandFormData, LearningOutcomeFormData,
  EvidenceRecord, EvidenceFormData, BulkEvidenceData,
  StudentProgress, OutcomeAchievement, ClassProgress,
  OutcomeSession, OutcomeSessionFormData, BulkOutcomeSessionData,
  OutcomeProgress, OutcomeProgressUpdateData, BulkOutcomeProgressData,
  StudentProgressSummary, CohortSummaryEntry, TeachingSession, TeachingSessionSummary
} from '@/app/plugins/cbc/types/cbc';

// ============================================================================
// Strands API
// ============================================================================

export const strandAPI = {
  getAll: async (params?: { curriculum?: number; subject?: number }) => {
    const response = await apiClient.get<Strand[]>('/strands/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<StrandDetail>(`/strands/${id}/`);
    return response.data;
  },

  getByCurriculum: async (curriculumId: number) => {
    const response = await apiClient.get<StrandDetail[]>('/strands/by_curriculum/', {
      params: { curriculum_id: curriculumId }
    });
    return response.data;
  },

  getBySubject: async (subjectId: number) => {
    const response = await apiClient.get<StrandDetail[]>('/cbc/strands/by_subject/', {
      params: { subject_id: subjectId }
    });
    return response.data;
  },

  create: async (data: StrandFormData) => {
    const response = await apiClient.post<Strand>('/admin/strands/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<StrandFormData>) => {
    const response = await apiClient.patch<Strand>(`/admin/strands/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/admin/strands/${id}/`);
  }
};

// ============================================================================
// Sub-Strands API
// ============================================================================

export const subStrandAPI = {
  getAll: async (params?: { strand?: number }) => {
    const response = await apiClient.get<SubStrand[]>('/admin/sub-strands/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<SubStrandDetail>(`/admin/sub-strands/${id}/`);
    return response.data;
  },

  create: async (data: SubStrandFormData) => {
    const response = await apiClient.post<SubStrand>('/admin/sub-strands/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<SubStrandFormData>) => {
    const response = await apiClient.patch<SubStrand>(`/admin/sub-strands/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/admin/sub-strands/${id}/`);
  }
};

// ============================================================================
// Learning Outcomes API
// ============================================================================

export const learningOutcomeAPI = {
  getAll: async (params?: { sub_strand?: number; level?: string; grade?: number }) => {
    const response = await apiClient.get<LearningOutcome[]>('/admin/learning-outcomes/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<LearningOutcome>(`/admin/learning-outcomes/${id}/`);
    return response.data;
  },

  getByStrand: async (strandId: number) => {
    const response = await apiClient.get<LearningOutcome[]>('/admin/learning-outcomes/by_strand/', {
      params: { strand_id: strandId }
    });
    return response.data;
  },

  getByLevel: async (level: string) => {
    const response = await apiClient.get<LearningOutcome[]>('/admin/learning-outcomes/by_level/', {
      params: { level }
    });
    return response.data;
  },

  create: async (data: LearningOutcomeFormData) => {
    const response = await apiClient.post<LearningOutcome>('/admin/learning-outcomes/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<LearningOutcomeFormData>) => {
    const response = await apiClient.patch<LearningOutcome>(`/admin/learning-outcomes/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/admin/learning-outcomes/${id}/`);
  }
};

// ============================================================================
// Evidence Records API
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
    const response = await apiClient.get<EvidenceRecord[]>('/evidence/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<EvidenceRecord>(`/evidence/${id}/`);
    return response.data;
  },

  create: async (data: EvidenceFormData) => {
    const response = await apiClient.post<EvidenceRecord>('/evidence/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<EvidenceFormData>) => {
    const response = await apiClient.patch<EvidenceRecord>(`/evidence/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/evidence/${id}/`);
  },

  bulkCreate: async (data: BulkEvidenceData) => {
    const response = await apiClient.post('/evidence/bulk_create/', data);
    return response.data;
  },

  getStudentProgress: async (studentId: number) => {
    const response = await apiClient.get<StudentProgress>('/evidence/student_progress/', {
      params: { student_id: studentId }
    });
    return response.data;
  },

  getOutcomeAchievement: async (outcomeId: number) => {
    const response = await apiClient.get<OutcomeAchievement>('/cbc/evidence/outcome_achievement/', {
      params: { outcome_id: outcomeId }
    });
    return response.data;
  },

  getClassProgress: async (cohortId: number) => {
    const response = await apiClient.get<ClassProgress[]>('/cbc/evidence/class_progress/', {
      params: { cohort_id: cohortId }
    });
    return response.data;
  }


};

// ============================================================================
// OutcomeSession API
// ============================================================================

export const outcomeSessionAPI = {
  getAll: async (params?: { session?: number; learning_outcome?: number; covered?: boolean }) => {
    const response = await apiClient.get<OutcomeSession[]>('/outcome-sessions/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<OutcomeSession>(`/outcome-sessions/${id}/`);
    return response.data;
  },

  bySession: async (sessionId: number) => {
    const response = await apiClient.get<OutcomeSession[]>('/outcome-sessions/by_session/', {
      params: { session_id: sessionId }
    });
    return response.data;
  },

  create: async (data: OutcomeSessionFormData) => {
    const response = await apiClient.post<OutcomeSession>('/outcome-sessions/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<OutcomeSessionFormData>) => {
    const response = await apiClient.patch<OutcomeSession>(`/outcome-sessions/${id}/`, data);
    return response.data;
  },

  markCovered: async (id: number, notes?: string) => {
    const response = await apiClient.patch<OutcomeSession>(
      `/outcome-sessions/${id}/mark_covered/`,
      { notes: notes ?? '' }
    );
    return response.data;
  },

  bulkCreate: async (data: BulkOutcomeSessionData) => {
    const response = await apiClient.post<{ detail: string; links: OutcomeSession[] }>(
      '/outcome-sessions/bulk_create/',
      data
    );
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/outcome-sessions/${id}/`);
  }
};

// ============================================================================
// OutcomeProgress API
// ============================================================================

export const outcomeProgressAPI = {
  getAll: async (params?: {
    student?: number;
    learning_outcome?: number;
    mastery_level?: string;
  }) => {
    const response = await apiClient.get<OutcomeProgress[]>('/outcome-progress/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<OutcomeProgress>(`/outcome-progress/${id}/`);
    return response.data;
  },

  update: async (id: number, data: OutcomeProgressUpdateData) => {
    const response = await apiClient.patch<OutcomeProgress>(`/outcome-progress/${id}/`, data);
    return response.data;
  },

  bulkUpdate: async (data: BulkOutcomeProgressData) => {
    const response = await apiClient.post<{ detail: string; records: OutcomeProgress[] }>(
      '/outcome-progress/bulk_update/',
      data
    );
    return response.data;
  },

  studentSummary: async (studentId: number) => {
    const response = await apiClient.get<StudentProgressSummary>(
      '/outcome-progress/student_summary/',
      { params: { student_id: studentId } }
    );
    return response.data;
  },

  cohortSummary: async (cohortId: number) => {
    const response = await apiClient.get<CohortSummaryEntry[]>(
      '/outcome-progress/cohort_summary/',
      { params: { cohort_id: cohortId } }
    );
    return response.data;
  }
};

// Add this new API object
export const teachingAPI = {
  /**
   * Get all teaching sessions for current teacher
   */
  getSessions: async (params?: {
    teacher?: number;
    cohort?: number;
    subject?: number;
    date?: string;
  }) => {
    const response = await apiClient.get<TeachingSession[]>(
      '/teaching-sessions/',
      { params }
    );
    return response.data;
  },

  /**
   * Get teaching sessions from recent days
   */
  getRecentSessions: async (days: number = 30) => {
    const response = await apiClient.get<TeachingSession[]>(
      '/teaching-sessions/recent/',
      { params: { days } }
    );
    return response.data;
  },

  /**
   * Get today's teaching sessions
   */
  getTodaySessions: async () => {
    const response = await apiClient.get<TeachingSession[]>(
      '/teaching-sessions/today/'
    );
    return response.data;
  },

  /**
   * Get single teaching session detail
   */
  getSession: async (sessionId: number) => {
    const response = await apiClient.get<TeachingSession>(
      `/teaching-sessions/${sessionId}/`
    );
    return response.data;
  },

  /**
   * Get all outcomes linked to a session
   */
  getSessionOutcomes: async (sessionId: number) => {
    const response = await apiClient.get<OutcomeSession[]>(
      `/teaching-sessions/${sessionId}/outcomes/`
    );
    return response.data;
  },

  /**
   * Get learners in session's cohort with evidence counts
   */
  getSessionLearners: async (sessionId: number) => {
    const response = await apiClient.get(
      `/teaching-sessions/${sessionId}/learners/`
    );
    return response.data;
  },

  /**
   * Get session teaching summary
   */
  getSessionSummary: async (sessionId: number) => {
    const response = await apiClient.get<TeachingSessionSummary>(
      `/teaching-sessions/${sessionId}/summary/`
    );
    return response.data;
  },

  /**
   * Get available learning outcomes for selection
   */
  getAvailableOutcomes: async (params: {
    subject?: number;
    grade?: number;
  }) => {
    const response = await apiClient.get<LearningOutcome[]>(
      '/learning-outcomes/',
      { params }
    );
    return response.data;
  },
};
