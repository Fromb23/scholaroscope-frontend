import { useCallback, useEffect, useState } from 'react';
import { academicIntelligenceAPI } from '@/app/core/api/academicIntelligence';
import type {
  ClassSubjectIntelligence,
  LearnerSubjectIntelligence,
} from '@/app/core/types/academicIntelligence';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';

export function useLearnerSubjectIntelligence(
  learnerId: number | null,
  cohortSubjectId: number | null,
  options?: {
    enabled?: boolean;
    termId?: number | null;
    includeEvidence?: boolean;
  },
) {
  const enabled = options?.enabled ?? true;
  const [intelligence, setIntelligence] = useState<LearnerSubjectIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntelligence = useCallback(async () => {
    if (!enabled || !learnerId || !cohortSubjectId) {
      setIntelligence(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setIntelligence(await academicIntelligenceAPI.getInstructorLearnerSubject(
        learnerId,
        cohortSubjectId,
        {
          termId: options?.termId,
          includeEvidence: options?.includeEvidence,
        },
      ));
      setError(null);
    } catch (requestError) {
      setIntelligence(null);
      setError(extractErrorMessage(requestError as ApiError, 'Failed to fetch academic intelligence'));
    } finally {
      setLoading(false);
    }
  }, [cohortSubjectId, enabled, learnerId, options?.includeEvidence, options?.termId]);

  useEffect(() => {
    void fetchIntelligence();
  }, [fetchIntelligence]);

  return { intelligence, loading, error, refetch: fetchIntelligence };
}

export function useClassSubjectIntelligence(
  cohortSubjectId: number | null,
  options?: {
    enabled?: boolean;
    termId?: number | null;
  },
) {
  const enabled = options?.enabled ?? true;
  const [intelligence, setIntelligence] = useState<ClassSubjectIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntelligence = useCallback(async () => {
    if (!enabled || !cohortSubjectId || !options?.termId) {
      setIntelligence(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setIntelligence(await academicIntelligenceAPI.getInstructorClassSubject(
        cohortSubjectId,
        { termId: options?.termId },
      ));
      setError(null);
    } catch (requestError) {
      setIntelligence(null);
      setError(extractErrorMessage(requestError as ApiError, 'Failed to fetch class intelligence'));
    } finally {
      setLoading(false);
    }
  }, [cohortSubjectId, enabled, options?.termId]);

  useEffect(() => {
    void fetchIntelligence();
  }, [fetchIntelligence]);

  return { intelligence, loading, error, refetch: fetchIntelligence };
}
