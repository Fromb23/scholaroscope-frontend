// ============================================================================
// app/hooks/useCBC.ts - CBC Data Hooks
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  strandAPI,
  subStrandAPI,
  learningOutcomeAPI,
  evidenceAPI,
  outcomeSessionAPI,
  outcomeProgressAPI,
  teachingAPI,
} from '@/app/plugins/cbc/api/cbc';
import {
  Strand, StrandDetail,
  SubStrand,
  LearningOutcome,
  EvidenceRecord,
  StudentProgress, ClassProgress,
  OutcomeSession,
  OutcomeProgress,
  StudentProgressSummary,
  CohortSummaryEntry,
  BulkOutcomeProgressData,
  TeachingSession,
  TeachingSessionSummary,
  SessionLearner,
  EvaluationType,
} from '@/app/plugins/cbc/types/cbc';

// ============================================================================
// Existing hooks
// ============================================================================

export const useStrands = (params?: { curriculum?: number; subject?: number }) => {
  const [strands, setStrands] = useState<Strand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStrands = async () => {
    try {
      setLoading(true);
      const data = await strandAPI.getAll(params);
      const strandsArray = Array.isArray(data)
        ? data
        : (data as any).results ?? [];
      setStrands(strandsArray);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch strands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrands();
  }, [params?.curriculum, params?.subject]);

  const createStrand = async (data: any) => {
    try {
      const newStrand = await strandAPI.create(data);
      setStrands(prev => [...prev, newStrand]);
      return newStrand;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create strand');
    }
  };

  const updateStrand = async (id: number, data: any) => {
    try {
      const updated = await strandAPI.update(id, data);
      setStrands(prev => prev.map(s => s.id === id ? updated : s));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update strand');
    }
  };

  const deleteStrand = async (id: number) => {
    try {
      await strandAPI.delete(id);
      setStrands(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete strand');
    }
  };

  return { strands, loading, error, refetch: fetchStrands, createStrand, updateStrand, deleteStrand };
};

export const useStrandDetail = (strandId: number | null) => {
  const [strand, setStrand] = useState<StrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!strandId) { setLoading(false); return; }
    const fetchStrand = async () => {
      try {
        setLoading(true);
        const data = await strandAPI.getById(strandId);
        setStrand(data);
        setError(null);
      } catch (err: any) {
        console.log("Error", error);
        setError(err.message || 'Failed to fetch strand details');
      } finally {
        setLoading(false);
      }
    };
    fetchStrand();
  }, [strandId]);

  return { strand, loading, error };
};

export const useSubStrands = (strandId?: number) => {
  const [subStrands, setSubStrands] = useState<SubStrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubStrands = async () => {
    try {
      setLoading(true);
      const data = await subStrandAPI.getAll(strandId ? { strand: strandId } : undefined);
      setSubStrands(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sub-strands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubStrands(); }, [strandId]);

  const createSubStrand = async (data: any) => {
    try {
      const newSubStrand = await subStrandAPI.create(data);
      setSubStrands(prev => [...prev, newSubStrand].sort((a, b) => a.sequence - b.sequence));
      return newSubStrand;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create sub-strand');
    }
  };

  const updateSubStrand = async (id: number, data: any) => {
    try {
      const updated = await subStrandAPI.update(id, data);
      setSubStrands(prev => prev.map(s => s.id === id ? updated : s));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update sub-strand');
    }
  };

  const deleteSubStrand = async (id: number) => {
    try {
      await subStrandAPI.delete(id);
      setSubStrands(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete sub-strand');
    }
  };

  return { subStrands, loading, error, refetch: fetchSubStrands, createSubStrand, updateSubStrand, deleteSubStrand };
};

export const useLearningOutcomes = (params?: { sub_strand?: number; level?: string }) => {
  const [outcomes, setOutcomes] = useState<LearningOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOutcomes = async () => {
    try {
      setLoading(true);
      const data = await learningOutcomeAPI.getAll(params);
      const learningOutcomeArray = Array.isArray(data)
        ? data
        : (data as any).results ?? []
      setOutcomes(learningOutcomeArray);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch learning outcomes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOutcomes(); }, [params?.sub_strand, params?.level]);

  const createOutcome = async (data: any) => {
    try {
      const newOutcome = await learningOutcomeAPI.create(data);
      setOutcomes(prev => [...prev, newOutcome]);
      return newOutcome;
    } catch (err: any) {
      console.log("Error", err);
      throw new Error(err.response?.data?.code || 'Failed to create learning outcome');
    }
  };

  const updateOutcome = async (id: number, data: any) => {
    try {
      const updated = await learningOutcomeAPI.update(id, data);
      setOutcomes(prev => prev.map(o => o.id === id ? updated : o));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update learning outcome');
    }
  };

  const deleteOutcome = async (id: number) => {
    try {
      await learningOutcomeAPI.delete(id);
      setOutcomes(prev => prev.filter(o => o.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete learning outcome');
    }
  };

  return { outcomes, loading, error, refetch: fetchOutcomes, createOutcome, updateOutcome, deleteOutcome };
};

export const useEvidence = (params?: {
  student?: number;
  learning_outcome?: number;
  source_type?: string;
}) => {
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      const data = await evidenceAPI.getAll(params);
      setEvidence(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch evidence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvidence(); }, [params?.student, params?.learning_outcome, params?.source_type]);

  const createEvidence = async (data: any) => {
    try {
      const newEvidence = await evidenceAPI.create(data);
      setEvidence(prev => [newEvidence, ...prev]);
      return newEvidence;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create evidence');
    }
  };

  const updateEvidence = async (id: number, data: any) => {
    try {
      const updated = await evidenceAPI.update(id, data);
      setEvidence(prev => prev.map(e => e.id === id ? updated : e));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update evidence');
    }
  };

  const deleteEvidence = async (id: number) => {
    try {
      await evidenceAPI.delete(id);
      setEvidence(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete evidence');
    }
  };

  return { evidence, loading, error, refetch: fetchEvidence, createEvidence, updateEvidence, deleteEvidence };
};

export const useStudentProgress = (studentId: number | null) => {
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const data = await evidenceAPI.getStudentProgress(studentId);
        setProgress(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch student progress');
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [studentId]);

  return { progress, loading, error };
};

export const useClassProgress = (cohortId: number | null) => {
  const [progress, setProgress] = useState<ClassProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cohortId) { setLoading(false); return; }
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const data = await evidenceAPI.getClassProgress(cohortId);
        setProgress(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch class progress');
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [cohortId]);

  return { progress, loading, error };
};

// ============================================================================
// New hooks — OutcomeSession & OutcomeProgress
// ============================================================================

/**
 * All OutcomeSession links scoped to a single session.
 * Exposes bulkTag (add multiple outcomes), markCovered, removeLink.
 * Used by: Session Detail → CBC Outcomes tab.
 */
export const useOutcomeSessions = (sessionId: number | null) => {
  const [links, setLinks] = useState<OutcomeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!sessionId) { setLoading(false); return; }
    try {
      setLoading(true);
      setLinks(await outcomeSessionAPI.bySession(sessionId));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch outcome links');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetch(); }, [fetch]);

  const bulkTag = async (outcomeIds: number[]) => {
    if (!sessionId) return;
    try {
      const res = await outcomeSessionAPI.bulkCreate({
        session: sessionId,
        learning_outcome_ids: outcomeIds,
      });
      const existingIds = new Set(links.map(l => l.id));
      const fresh = res.links.filter((l: OutcomeSession) => !existingIds.has(l.id));
      setLinks(prev => [...prev, ...fresh]);
      return res;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to tag outcomes');
    }
  };

  const markCovered = async (linkId: number, notes?: string) => {
    try {
      const updated = await outcomeSessionAPI.markCovered(linkId, notes);
      setLinks(prev => prev.map(l => l.id === linkId ? updated : l));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to mark covered');
    }
  };

  const removeLink = async (linkId: number) => {
    try {
      await outcomeSessionAPI.delete(linkId);
      setLinks(prev => prev.filter(l => l.id !== linkId));
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to remove link');
    }
  };

  return { links, loading, error, refetch: fetch, bulkTag, markCovered, removeLink };
};

/**
 * Strand-grouped mastery summary for one student.
 * Reads the OutcomeProgress cache via student_summary action.
 * Used by: Student Progress page.
 */
export const useOutcomeProgressSummary = (studentId: number | null) => {
  const [summary, setSummary] = useState<StudentProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    try {
      setLoading(true);
      setSummary(await outcomeProgressAPI.studentSummary(studentId));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch progress summary');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { summary, loading, error, refetch: fetch };
};

/**
 * Cohort-wide mastery summary — one row per student.
 * Reads the OutcomeProgress cache via cohort_summary action.
 * Used by: Cohort Progress page.
 */
export const useCohortSummary = (cohortId: number | null) => {
  const [entries, setEntries] = useState<CohortSummaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!cohortId) { setLoading(false); return; }
    try {
      setLoading(true);
      setEntries(await outcomeProgressAPI.cohortSummary(cohortId));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cohort summary');
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { entries, loading, error, refetch: fetch };
};

/**
 * Raw OutcomeProgress rows for a student.
 * Used when you need per-outcome mastery detail (expanded rows on student page).
 * Also exposes bulkUpdate for teacher mastery adjustments.
 */
export const useOutcomeProgress = (studentId: number | null) => {
  const [records, setRecords] = useState<OutcomeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    try {
      setLoading(true);
      setRecords(await outcomeProgressAPI.getAll({ student: studentId }));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch outcome progress');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetch(); }, [fetch]);

  const bulkUpdate = async (payload: BulkOutcomeProgressData) => {
    try {
      await outcomeProgressAPI.bulkUpdate(payload);
      await fetch(); // re-sync after write
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to update progress');
    }
  };

  return { records, loading, error, refetch: fetch, bulkUpdate };
};

/**
 * Get teaching sessions for current teacher
 * Used by: Teaching dashboard, session list page
 */
export const useTeachingSessions = (params?: {
  teacher?: number;
  cohort?: number;
  subject?: number;
  recent?: boolean;
  days?: number;
}) => {
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      let data: TeachingSession[];

      if (params?.recent) {
        data = await teachingAPI.getRecentSessions(params.days);
      } else {
        data = await teachingAPI.getSessions(params);
      }

      setSessions(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch teaching sessions');
    } finally {
      setLoading(false);
    }
  }, [params?.teacher, params?.cohort, params?.subject, params?.recent, params?.days]);

  useEffect(() => { fetch(); }, [fetch]);

  return { sessions, loading, error, refetch: fetch };
};

/**
 * Get today's teaching sessions
 * Used by: Teaching dashboard homepage
 */
export const useTodaySessions = () => {
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await teachingAPI.getTodaySessions();
      setSessions(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch today\'s sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { sessions, loading, error, refetch: fetch };
};

/**
 * Get single teaching session detail
 * Used by: Session workspace page
 */
export const useTeachingSession = (sessionId: number | null) => {
  const [session, setSession] = useState<TeachingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!sessionId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await teachingAPI.getSession(sessionId);
      setSession(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { session, loading, error, refetch: fetch };
};

/**
 * Get session teaching summary
 * Used by: Session workspace header
 */
export const useSessionSummary = (sessionId: number | null) => {
  const [summary, setSummary] = useState<TeachingSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!sessionId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await teachingAPI.getSessionSummary(sessionId);
      setSummary(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch session summary');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { summary, loading, error, refetch: fetch };
};

/**
 * Get learners in session's cohort
 * Used by: Evidence capture page
 */
export const useSessionLearners = (sessionId: number | null) => {
  const [learners, setLearners] = useState<SessionLearner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!sessionId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await teachingAPI.getSessionLearners(sessionId);
      setLearners(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch learners');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { learners, loading, error, refetch: fetch };
};


export const useSessionEvidence = (
  learningOutcomeId: number,
  sessionId: number
) => {
  const [evidenceRecords, setEvidenceRecords] =
    useState<Map<number, EvidenceRecord[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🔹 Fetch evidence
  const fetchEvidence = async () => {
    if (!learningOutcomeId || !sessionId) return;

    setLoading(true);
    try {
      const data = await evidenceAPI.getAll({
        learning_outcome: learningOutcomeId,
        source_type: 'SESSION',
        source_id: sessionId,
      });

      const grouped = new Map<number, EvidenceRecord[]>();
      data.forEach((record) => {
        if (!grouped.has(record.student)) {
          grouped.set(record.student, []);
        }
        grouped.get(record.student)!.push(record);
      });

      setEvidenceRecords(grouped);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Create evidence
  const createEvidence = async (args: {
    studentId: number;
    evaluationType: EvaluationType;
    numericScore: number | null;
    narrative: string;
    observedAt: string;
  }) => {
    setSaving(true);
    try {
      const record = await evidenceAPI.create({
        student: args.studentId,
        learning_outcome: learningOutcomeId,
        source_type: 'SESSION',
        source_id: sessionId,
        evaluation_type: args.evaluationType,
        numeric_score: args.evaluationType === 'NUMERIC'
          ? args.numericScore
          : null,
        narrative: args.narrative,
        observed_at: args.observedAt,
        recorded_by: ''
      });

      // ✅ OPTION 2: Refetch all evidence instead of optimistic update
      // This ensures no duplicates and always shows the server state
      await fetchEvidence();

      return record;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [learningOutcomeId, sessionId]);

  return {
    evidenceRecords,
    loading,
    saving,
    fetchEvidence,
    createEvidence,
  };
};
