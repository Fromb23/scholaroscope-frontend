import { apiClient } from '@/app/core/api/client';
import { unwrapPaginated } from '@/app/core/api/unwrap';
import type {
  PlanPremiumPluginPrice,
  SubscriptionPeriodPayload,
  SubscriptionPlan,
  WorkspaceBillingProfile,
  WorkspaceSubscriptionPeriod,
  WorkspaceSubscriptionSummary,
} from '@/app/core/types/subscriptions';

export const subscriptionAPI = {
  getWorkspaceSummary: async (organizationId?: number | null): Promise<WorkspaceSubscriptionSummary> => {
    const response = await apiClient.get<WorkspaceSubscriptionSummary>(
      '/subscriptions/workspace-summary/',
      { params: organizationId ? { organization: organizationId } : undefined }
    );
    return response.data;
  },

  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get<SubscriptionPlan[] | { results?: SubscriptionPlan[] }>(
      '/subscription-plans/'
    );
    return unwrapPaginated(response.data);
  },

  getPremiumPluginPrices: async (): Promise<PlanPremiumPluginPrice[]> => {
    const response = await apiClient.get<PlanPremiumPluginPrice[] | { results?: PlanPremiumPluginPrice[] }>(
      '/subscription-plugin-prices/'
    );
    return unwrapPaginated(response.data);
  },

  getPeriods: async (organizationId?: number | null): Promise<WorkspaceSubscriptionPeriod[]> => {
    const response = await apiClient.get<WorkspaceSubscriptionPeriod[] | { results?: WorkspaceSubscriptionPeriod[] }>(
      '/subscription-periods/',
      { params: organizationId ? { organization: organizationId } : undefined }
    );
    return unwrapPaginated(response.data);
  },

  createPeriod: async (payload: SubscriptionPeriodPayload): Promise<WorkspaceSubscriptionPeriod> => {
    const response = await apiClient.post<WorkspaceSubscriptionPeriod>('/subscription-periods/', payload);
    return response.data;
  },

  updatePeriod: async (
    periodId: number,
    payload: SubscriptionPeriodPayload
  ): Promise<WorkspaceSubscriptionPeriod> => {
    const response = await apiClient.patch<WorkspaceSubscriptionPeriod>(
      `/subscription-periods/${periodId}/`,
      payload
    );
    return response.data;
  },

  schedulePeriod: async (periodId: number): Promise<WorkspaceSubscriptionPeriod> => {
    const response = await apiClient.post<WorkspaceSubscriptionPeriod>(
      `/subscription-periods/${periodId}/schedule/`
    );
    return response.data;
  },

  activatePeriod: async (periodId: number): Promise<WorkspaceSubscriptionPeriod> => {
    const response = await apiClient.post<WorkspaceSubscriptionPeriod>(
      `/subscription-periods/${periodId}/activate/`
    );
    return response.data;
  },

  cancelPeriod: async (periodId: number): Promise<WorkspaceSubscriptionPeriod> => {
    const response = await apiClient.post<WorkspaceSubscriptionPeriod>(
      `/subscription-periods/${periodId}/cancel/`
    );
    return response.data;
  },

  emergencyDisableTermGate: async (
    profileId: number,
    reason: string
  ): Promise<WorkspaceBillingProfile> => {
    const response = await apiClient.post<WorkspaceBillingProfile>(
      `/billing-profiles/${profileId}/emergency-disable-term-gate/`,
      { reason }
    );
    return response.data;
  },
};

