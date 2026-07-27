import { useCallback, useEffect, useState } from 'react';
import { institutionalRevenueAPI } from '@/app/core/api/institutionalRevenue';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type {
  InstitutionRevenueCalculationRun,
  InstitutionRevenueCycle,
  InstitutionRevenuePolicy,
  RevenueCycleOverview,
  RevenuePolicyPayload,
  RosterProjectionSummary,
  SchemeEntryOption,
  StatementReviewState,
  TeacherContributionStatement,
} from '@/app/core/types/institutionalRevenue';

export function useInstitutionalRevenueOverview() {
  const [overview, setOverview] = useState<RevenueCycleOverview | null>(null);
  const [cycles, setCycles] = useState<InstitutionRevenueCycle[]>([]);
  const [policies, setPolicies] = useState<InstitutionRevenuePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewData, cycleData, policyData] = await Promise.all([
        institutionalRevenueAPI.getOverview(),
        institutionalRevenueAPI.listCycles(),
        institutionalRevenueAPI.listPolicies(),
      ]);
      setOverview(overviewData);
      setCycles(cycleData);
      setPolicies(policyData);
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Unable to load revenue cycle data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { overview, cycles, policies, loading, error, refetch };
}

export function useRevenuePolicies() {
  const [policies, setPolicies] = useState<InstitutionRevenuePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setPolicies(await institutionalRevenueAPI.listPolicies());
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Unable to load revenue policies.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createPolicy = async (payload: RevenuePolicyPayload) => {
    const policy = await institutionalRevenueAPI.createPolicy(payload);
    await refetch();
    return policy;
  };

  const updatePolicy = async (policyId: string, payload: Partial<RevenuePolicyPayload>) => {
    const policy = await institutionalRevenueAPI.updatePolicy(policyId, payload);
    await refetch();
    return policy;
  };

  const activatePolicy = async (policyId: string) => {
    const policy = await institutionalRevenueAPI.activatePolicy(policyId);
    await refetch();
    return policy;
  };

  return { policies, loading, error, refetch, createPolicy, updatePolicy, activatePolicy };
}

export function useRevenueCycleDetail(cycleId: string | null) {
  const [cycle, setCycle] = useState<InstitutionRevenueCycle | null>(null);
  const [roster, setRoster] = useState<RosterProjectionSummary | null>(null);
  const [runs, setRuns] = useState<InstitutionRevenueCalculationRun[]>([]);
  const [statements, setStatements] = useState<TeacherContributionStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!cycleId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [cycleData, rosterData, runData, statementData] = await Promise.all([
        institutionalRevenueAPI.getCycle(cycleId),
        institutionalRevenueAPI.getRosterProjection(cycleId).catch(() => null),
        institutionalRevenueAPI.listCalculationRuns(cycleId),
        institutionalRevenueAPI.listStatements(cycleId),
      ]);
      setCycle(cycleData);
      setRoster(rosterData);
      setRuns(runData);
      setStatements(statementData);
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Unable to load revenue cycle.'));
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const action = async (operation: () => Promise<unknown>) => {
    await operation();
    await refetch();
  };

  return {
    cycle,
    roster,
    runs,
    statements,
    loading,
    error,
    refetch,
    openCycle: () => action(() => institutionalRevenueAPI.openCycle(cycleId as string)),
    refreshRoster: () => action(() => institutionalRevenueAPI.refreshRosterProjection(cycleId as string)),
    runCalculation: () => action(() => institutionalRevenueAPI.runCalculation(cycleId as string)),
    markUnderReview: () => action(() => institutionalRevenueAPI.markUnderReview(cycleId as string)),
    approveCycle: () => action(() => institutionalRevenueAPI.approveCycle(cycleId as string)),
    closeCycle: () => action(() => institutionalRevenueAPI.closeCycle(cycleId as string)),
  };
}

export function useTeacherContributionStatement(statementId: string | null) {
  const [statement, setStatement] = useState<TeacherContributionStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!statementId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setStatement(await institutionalRevenueAPI.getStatement(statementId));
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Unable to load teacher contribution statement.'));
    } finally {
      setLoading(false);
    }
  }, [statementId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const reviewStatement = async (reviewState: StatementReviewState, reviewNote?: string) => {
    if (!statementId) return null;
    const updated = await institutionalRevenueAPI.reviewStatement(statementId, {
      review_state: reviewState,
      review_note: reviewNote,
    });
    setStatement(updated);
    return updated;
  };

  return { statement, loading, error, refetch, reviewStatement };
}

export function useSchemeEntryOptions(cohortSubject?: number | null, term?: number | null) {
  const [options, setOptions] = useState<SchemeEntryOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cohortSubject || !term) {
      setOptions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    institutionalRevenueAPI.listSchemeEntryOptions({ cohort_subject: cohortSubject, term })
      .then((items) => {
        if (!cancelled) setOptions(items);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cohortSubject, term]);

  return { options, loading };
}
