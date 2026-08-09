import { useCallback, useEffect, useState } from 'react';

import { cohortSubjectReportsAPI } from '@/app/core/api/reporting';
import type {
  ClassSubjectReportPayload,
  InstructorCohortSubjectLearnersReport,
  InstructorCohortSubjectPerformanceReport,
  InstructorCohortSubjectTeachingActivityReport,
} from '@/app/core/types/reporting';
import type { ApiError } from '@/app/core/types/errors';
import { resolveErrorMessage } from '@/app/core/types/errors';

type AuthorityMode = 'teaching' | 'supervision';

function useProjection<T>(
  enabled: boolean,
  load: () => Promise<T>,
  fallbackMessage: string,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setData(await load());
      setError(null);
      setErrorStatus(null);
    } catch (caught) {
      const apiError = caught as ApiError;
      setData(null);
      setError(resolveErrorMessage(apiError, fallbackMessage));
      setErrorStatus(apiError.response?.status ?? null);
    } finally {
      setLoading(false);
    }
  }, [enabled, fallbackMessage, load]);

  useEffect(() => { void refetch(); }, [refetch]);
  return { data, loading, error, errorStatus, refetch };
}

export function useCanonicalCohortSubjectOverview(
  cohortSubjectId: number,
  termId: number | null,
  authorityMode: AuthorityMode,
  enabled: boolean,
) {
  const load = useCallback(
    () => cohortSubjectReportsAPI.getOverview(cohortSubjectId, { termId, authorityMode }),
    [authorityMode, cohortSubjectId, termId],
  );
  return useProjection<ClassSubjectReportPayload>(enabled, load, 'Failed to load the class-subject overview.');
}

export function useCanonicalCohortSubjectLearners(
  cohortSubjectId: number,
  termId: number | null,
  authorityMode: AuthorityMode,
  enabled: boolean,
) {
  const load = useCallback(
    () => cohortSubjectReportsAPI.getLearners(cohortSubjectId, { termId, authorityMode }),
    [authorityMode, cohortSubjectId, termId],
  );
  return useProjection<InstructorCohortSubjectLearnersReport>(enabled, load, 'Failed to load learners.');
}

export function useCanonicalCohortSubjectPerformance(
  cohortSubjectId: number,
  termId: number | null,
  authorityMode: AuthorityMode,
  enabled: boolean,
) {
  const load = useCallback(
    () => cohortSubjectReportsAPI.getPerformance(cohortSubjectId, { termId, authorityMode }),
    [authorityMode, cohortSubjectId, termId],
  );
  return useProjection<InstructorCohortSubjectPerformanceReport>(enabled, load, 'Failed to load assessments and results.');
}

export function useCanonicalCohortSubjectTeachingActivity(
  cohortSubjectId: number,
  termId: number | null,
  authorityMode: AuthorityMode,
  enabled: boolean,
) {
  const load = useCallback(
    () => cohortSubjectReportsAPI.getTeachingActivity(cohortSubjectId, { termId, authorityMode }),
    [authorityMode, cohortSubjectId, termId],
  );
  return useProjection<InstructorCohortSubjectTeachingActivityReport>(enabled, load, 'Failed to load teaching and curriculum activity.');
}

