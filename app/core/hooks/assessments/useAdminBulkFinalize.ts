import { useCallback, useState } from 'react';
import {
  assessmentAPI,
  type AssessmentBulkFinalizePayload,
  type AssessmentBulkFinalizeResult,
} from '@/app/core/api/assessments';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';

interface UseAdminBulkFinalizeOptions {
  onSuccess?: (result: AssessmentBulkFinalizeResult) => Promise<void> | void;
}

export function useAdminBulkFinalize(options?: UseAdminBulkFinalizeOptions) {
  const onSuccess = options?.onSuccess;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentBulkFinalizeResult | null>(null);

  const bulkFinalize = useCallback(async (payload: AssessmentBulkFinalizePayload) => {
    setLoading(true);
    setError(null);
    try {
      const nextResult = await assessmentAPI.bulkFinalize(payload);
      setResult(nextResult);
      await onSuccess?.(nextResult);
      return nextResult;
    } catch (err) {
      const message = extractErrorMessage(err as ApiError, 'Failed to bulk finalize assessments');
      setError(message);
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
    bulkFinalize,
    loading,
    error,
    result,
    reset,
  };
}
