import { useCallback, useState } from 'react';
import { assessmentAPI, type AssessmentBulkReopenPayload, type AssessmentBulkReopenResult } from '@/app/core/api/assessments';
import { resolveAssessmentError } from '@/app/core/errors';

interface UseAdminBulkReopenOptions {
  onSuccess?: (result: AssessmentBulkReopenResult) => Promise<void> | void;
}

export function useAdminBulkReopen(options?: UseAdminBulkReopenOptions) {
  const onSuccess = options?.onSuccess;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentBulkReopenResult | null>(null);

  const bulkReopen = useCallback(async (payload: AssessmentBulkReopenPayload) => {
    setLoading(true);
    setError(null);
    try {
      const nextResult = await assessmentAPI.bulkReopen(payload);
      setResult(nextResult);
      await onSuccess?.(nextResult);
      return nextResult;
    } catch (err) {
      const appError = resolveAssessmentError(err, {
        action: 'update',
        entityLabel: 'assessment restoration',
      });
      setError(appError.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return {
    bulkReopen,
    loading,
    error,
    result,
    reset,
  };
}
