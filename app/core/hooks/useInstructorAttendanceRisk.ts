import { useCallback, useEffect, useMemo, useState } from 'react';
import { reportingAPI } from '@/app/core/api/reporting';
import type { InstructorAttendanceRiskResponse } from '@/app/core/types/reporting';
import { ApiError, resolveErrorMessage } from '@/app/core/types/errors';

interface UseInstructorAttendanceRiskParams {
  termId?: number;
  threshold?: number;
}

export function useInstructorAttendanceRisk({
  termId,
  threshold,
}: UseInstructorAttendanceRiskParams = {}) {
  const [data, setData] = useState<InstructorAttendanceRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendanceRisk = useCallback(async () => {
    try {
      setLoading(true);
      setData(await reportingAPI.getInstructorAttendanceRisk({
        term: termId,
        threshold,
      }));
      setError(null);
    } catch (err) {
      setData(null);
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch attendance risk'));
    } finally {
      setLoading(false);
    }
  }, [termId, threshold]);

  useEffect(() => {
    void fetchAttendanceRisk();
  }, [fetchAttendanceRisk]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const count = data?.count ?? items.length;
  const uniqueLearnerCount = data?.unique_learner_count ?? new Set(items.map((item) => item.student_id)).size;

  return {
    data,
    items,
    count,
    uniqueLearnerCount,
    loading,
    error,
    refetch: fetchAttendanceRisk,
  };
}
