import { apiClient } from '@/app/core/api/client';
import type {
  InstitutionRevenueCalculationRun,
  InstitutionRevenueCycle,
  InstitutionRevenuePolicy,
  RevenuePolicyPayload,
  RosterProjectionSummary,
  SchemeEntryOption,
  TeacherContributionStatement,
  RevenueCycleOverview,
  StatementReviewState,
} from '@/app/core/types/institutionalRevenue';

function unwrapList<T>(payload: T[] | { results?: T[] }): T[] {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

export const institutionalRevenueAPI = {
  listPolicies: async (): Promise<InstitutionRevenuePolicy[]> => {
    const response = await apiClient.get<InstitutionRevenuePolicy[] | { results?: InstitutionRevenuePolicy[] }>('/revenue/policies/');
    return unwrapList(response.data);
  },
  createPolicy: async (payload: RevenuePolicyPayload): Promise<InstitutionRevenuePolicy> => {
    const response = await apiClient.post<InstitutionRevenuePolicy>('/revenue/policies/', payload);
    return response.data;
  },
  updatePolicy: async (policyId: string, payload: Partial<RevenuePolicyPayload>): Promise<InstitutionRevenuePolicy> => {
    const response = await apiClient.patch<InstitutionRevenuePolicy>(`/revenue/policies/${policyId}/`, payload);
    return response.data;
  },
  activatePolicy: async (policyId: string): Promise<InstitutionRevenuePolicy> => {
    const response = await apiClient.post<InstitutionRevenuePolicy>(`/revenue/policies/${policyId}/activate/`);
    return response.data;
  },
  listCycles: async (): Promise<InstitutionRevenueCycle[]> => {
    const response = await apiClient.get<InstitutionRevenueCycle[] | { results?: InstitutionRevenueCycle[] }>('/revenue/cycles/');
    return unwrapList(response.data);
  },
  createCycle: async (academicTerm: number, subscriptionPeriod?: number | null): Promise<InstitutionRevenueCycle> => {
    const response = await apiClient.post<InstitutionRevenueCycle>('/revenue/cycles/', {
      academic_term: academicTerm,
      subscription_period: subscriptionPeriod ?? null,
    });
    return response.data;
  },
  getCycle: async (cycleId: string): Promise<InstitutionRevenueCycle> => {
    const response = await apiClient.get<InstitutionRevenueCycle>(`/revenue/cycles/${cycleId}/`);
    return response.data;
  },
  getOverview: async (): Promise<RevenueCycleOverview> => {
    const response = await apiClient.get<RevenueCycleOverview>('/revenue/cycles/overview/');
    return response.data;
  },
  openCycle: async (cycleId: string): Promise<InstitutionRevenueCycle> => {
    const response = await apiClient.post<InstitutionRevenueCycle>(`/revenue/cycles/${cycleId}/open/`);
    return response.data;
  },
  getRosterProjection: async (cycleId: string): Promise<RosterProjectionSummary> => {
    const response = await apiClient.get<RosterProjectionSummary>(`/revenue/cycles/${cycleId}/roster-projection/`);
    return response.data;
  },
  refreshRosterProjection: async (cycleId: string): Promise<RosterProjectionSummary> => {
    const response = await apiClient.post<RosterProjectionSummary>(`/revenue/cycles/${cycleId}/roster-projection/`);
    return response.data;
  },
  runCalculation: async (cycleId: string): Promise<InstitutionRevenueCalculationRun> => {
    const response = await apiClient.post<InstitutionRevenueCalculationRun>(`/revenue/cycles/${cycleId}/run-calculation/`);
    return response.data;
  },
  listCalculationRuns: async (cycleId: string): Promise<InstitutionRevenueCalculationRun[]> => {
    const response = await apiClient.get<InstitutionRevenueCalculationRun[] | { results?: InstitutionRevenueCalculationRun[] }>(
      `/revenue/cycles/${cycleId}/calculation-runs/`,
    );
    return unwrapList(response.data);
  },
  listStatements: async (cycleId: string): Promise<TeacherContributionStatement[]> => {
    const response = await apiClient.get<TeacherContributionStatement[] | { results?: TeacherContributionStatement[] }>(
      `/revenue/cycles/${cycleId}/statements/`,
    );
    return unwrapList(response.data);
  },
  getStatement: async (statementId: string): Promise<TeacherContributionStatement> => {
    const response = await apiClient.get<TeacherContributionStatement>(`/revenue/teacher-statements/${statementId}/`);
    return response.data;
  },
  reviewStatement: async (
    statementId: string,
    payload: { review_state: StatementReviewState; review_note?: string },
  ): Promise<TeacherContributionStatement> => {
    const response = await apiClient.post<TeacherContributionStatement>(`/revenue/teacher-statements/${statementId}/review/`, payload);
    return response.data;
  },
  markUnderReview: async (cycleId: string): Promise<InstitutionRevenueCycle> => {
    const response = await apiClient.post<InstitutionRevenueCycle>(`/revenue/cycles/${cycleId}/under-review/`);
    return response.data;
  },
  approveCycle: async (cycleId: string): Promise<InstitutionRevenueCycle> => {
    const response = await apiClient.post<InstitutionRevenueCycle>(`/revenue/cycles/${cycleId}/approve/`);
    return response.data;
  },
  closeCycle: async (cycleId: string): Promise<InstitutionRevenueCycle> => {
    const response = await apiClient.post<InstitutionRevenueCycle>(`/revenue/cycles/${cycleId}/close/`);
    return response.data;
  },
  listSchemeEntryOptions: async (params: { cohort_subject?: number | null; term?: number | null }): Promise<SchemeEntryOption[]> => {
    const response = await apiClient.get<SchemeEntryOption[] | { results?: SchemeEntryOption[] }>('/revenue/scheme-entry-options/', { params });
    return unwrapList(response.data);
  },
};
