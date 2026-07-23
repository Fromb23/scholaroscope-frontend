import { useCallback, useEffect, useState } from 'react';

import { learnerPortfolioAPI } from '@/app/core/api/portfolio';
import { resolveErrorMessage, type ApiError } from '@/app/core/types/errors';
import type {
  LearnerPortfolioFilters,
  LearnerPortfolioPayload,
  PortfolioEvidence,
} from '@/app/core/types/portfolio';

function statusCode(err: ApiError): number | null {
  return typeof err.response?.status === 'number' ? err.response.status : null;
}

export function useLearnerPortfolio(
  learnerId: number | null,
  filters: LearnerPortfolioFilters,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const [portfolio, setPortfolio] = useState<LearnerPortfolioPayload | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!learnerId || !enabled) {
      setLoading(false);
      if (!learnerId) {
        setPortfolio(null);
      }
      return;
    }

    try {
      setLoading(true);
      setPortfolio(await learnerPortfolioAPI.getPortfolio(learnerId, filters));
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      const apiError = err as ApiError;
      setPortfolio(null);
      setError(resolveErrorMessage(apiError, 'Could not load learner portfolio.'));
      setErrorStatus(statusCode(apiError));
    } finally {
      setLoading(false);
    }
  }, [enabled, filters, learnerId]);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  return { portfolio, loading, error, errorStatus, refetch: fetchPortfolio };
}

export function useLearnerPortfolioEvidenceDetail(
  learnerId: number | null,
  evidenceId: number | null,
  filters: LearnerPortfolioFilters,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const [evidence, setEvidence] = useState<PortfolioEvidence | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled && evidenceId));
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const fetchEvidence = useCallback(async () => {
    if (!learnerId || !evidenceId || !enabled) {
      setLoading(false);
      if (!evidenceId) {
        setEvidence(null);
        setError(null);
        setErrorStatus(null);
      }
      return;
    }

    try {
      setLoading(true);
      setEvidence(await learnerPortfolioAPI.getEvidenceDetail(learnerId, evidenceId, filters));
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      const apiError = err as ApiError;
      setEvidence(null);
      setError(resolveErrorMessage(apiError, 'Could not load this evidence record.'));
      setErrorStatus(statusCode(apiError));
    } finally {
      setLoading(false);
    }
  }, [enabled, evidenceId, filters, learnerId]);

  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);

  return { evidence, loading, error, errorStatus, refetch: fetchEvidence };
}
