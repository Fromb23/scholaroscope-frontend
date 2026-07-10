import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { subscriptionAPI } from '@/app/core/api/subscriptions';
import { useOrganizationContext } from '@/app/context/OrganizationContext';
import type {
  SubscriptionPeriodPayload,
  WorkspaceSubscriptionPeriod,
} from '@/app/core/types/subscriptions';

export const subscriptionKeys = {
  summary: (organizationId?: number | null) => ['subscriptions', 'summary', organizationId ?? 'current'] as const,
  periods: (organizationId?: number | null) => ['subscriptions', 'periods', organizationId ?? 'current'] as const,
  plans: ['subscriptions', 'plans'] as const,
  premiumPrices: ['subscriptions', 'premium-prices'] as const,
};

function invalidateWorkspaceSubscriptions(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId?: number | null
) {
  void queryClient.invalidateQueries({ queryKey: subscriptionKeys.summary(organizationId) });
  void queryClient.invalidateQueries({ queryKey: subscriptionKeys.periods(organizationId) });
}

export function useWorkspaceSubscriptionSummary(
  organizationId?: number | null,
  options: { enabled?: boolean } = {}
) {
  const { organizationId: scopedOrganizationId } = useOrganizationContext();
  const resolvedOrganizationId = organizationId ?? scopedOrganizationId;
  const enabled = options.enabled ?? true;
  return useQuery({
    queryKey: subscriptionKeys.summary(resolvedOrganizationId),
    queryFn: () => subscriptionAPI.getWorkspaceSummary(resolvedOrganizationId),
    enabled,
  });
}

export function useSubscriptionPeriods(
  organizationId?: number | null,
  options: { enabled?: boolean } = {}
) {
  const { organizationId: scopedOrganizationId } = useOrganizationContext();
  const resolvedOrganizationId = organizationId ?? scopedOrganizationId;
  const enabled = options.enabled ?? true;
  return useQuery({
    queryKey: subscriptionKeys.periods(resolvedOrganizationId),
    queryFn: () => subscriptionAPI.getPeriods(resolvedOrganizationId),
    enabled,
  });
}

export function useSubscriptionPlans(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  return useQuery({
    queryKey: subscriptionKeys.plans,
    queryFn: subscriptionAPI.getPlans,
    enabled,
  });
}

export function usePlanPremiumPluginPrices(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  return useQuery({
    queryKey: subscriptionKeys.premiumPrices,
    queryFn: subscriptionAPI.getPremiumPluginPrices,
    enabled,
  });
}

export function useWorkspaceSubscriptionActions(organizationId?: number | null) {
  const queryClient = useQueryClient();

  const afterMutation = (period?: WorkspaceSubscriptionPeriod) => {
    invalidateWorkspaceSubscriptions(queryClient, organizationId ?? period?.organization);
    void queryClient.invalidateQueries({ queryKey: subscriptionKeys.plans });
    void queryClient.invalidateQueries({ queryKey: subscriptionKeys.premiumPrices });
  };

  const createPeriod = useMutation({
    mutationFn: (payload: SubscriptionPeriodPayload) => subscriptionAPI.createPeriod(payload),
    onSuccess: afterMutation,
  });

  const updatePeriod = useMutation({
    mutationFn: ({ periodId, payload }: { periodId: number; payload: SubscriptionPeriodPayload }) =>
      subscriptionAPI.updatePeriod(periodId, payload),
    onSuccess: afterMutation,
  });

  const schedulePeriod = useMutation({
    mutationFn: (periodId: number) => subscriptionAPI.schedulePeriod(periodId),
    onSuccess: afterMutation,
  });

  const activatePeriod = useMutation({
    mutationFn: (periodId: number) => subscriptionAPI.activatePeriod(periodId),
    onSuccess: afterMutation,
  });

  const cancelPeriod = useMutation({
    mutationFn: (periodId: number) => subscriptionAPI.cancelPeriod(periodId),
    onSuccess: afterMutation,
  });

  return {
    createPeriod,
    updatePeriod,
    schedulePeriod,
    activatePeriod,
    cancelPeriod,
  };
}

export function useWorkspaceSubscriptionManager(
  organizationId?: number | null,
  options: { enabled?: boolean; loadCommercialPolicy?: boolean } = {}
) {
  const enabled = options.enabled ?? true;
  const loadCommercialPolicy = options.loadCommercialPolicy ?? false;
  const summaryQuery = useWorkspaceSubscriptionSummary(organizationId, { enabled });
  const periodsQuery = useSubscriptionPeriods(organizationId, { enabled });
  const plansQuery = useSubscriptionPlans({ enabled: enabled && loadCommercialPolicy });
  const pricesQuery = usePlanPremiumPluginPrices({ enabled: enabled && loadCommercialPolicy });
  const actions = useWorkspaceSubscriptionActions(organizationId);

  return {
    summaryQuery,
    periodsQuery,
    plansQuery,
    pricesQuery,
    actions,
  };
}
