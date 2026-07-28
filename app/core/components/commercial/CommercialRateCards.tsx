'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  Home,
  Landmark,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import { useCommercialCatalog, useCommercialQuote } from '@/app/core/hooks/useCommercialCatalog';
import type {
  CommercialMode,
  CommercialPremiumPlugin,
  CommercialQuote,
  CommercialWorkspaceType,
} from '@/app/core/types/commercialCatalog';
import type { OrgType } from '@/app/core/types/auth';
import { CapabilityList } from './CapabilityList';
import { CommercialQuoteSummary } from './CommercialQuoteSummary';
import { PremiumPluginSelector } from './PremiumPluginSelector';
import { formatMoney } from '@/app/core/lib/money';

interface CommercialRateCardsProps {
  authenticated?: boolean;
  continueBasePath?: string;
  workspaceOnboarding?: boolean;
}

type OnboardingActiveStage = 'selection' | 'summary';

const workspaceIcons: Partial<Record<OrgType, LucideIcon>> = {
  INSTITUTION: Landmark,
  TUITION_CENTER: Building2,
  HOMESCHOOL: Home,
  LEARNER_WORKSPACE: GraduationCap,
  PERSONAL: Users,
  INDEPENDENT_TEACHER: Users,
};

function planCopy(mode: CommercialMode) {
  if (mode === 'PREMIUM') {
    return {
      title: 'Standard + Premium',
      body: 'Start with Standard and add only the premium curriculum or specialist capabilities you need.',
      benefits: ['Standard foundation included', 'Choose premium capabilities', 'Backend-confirmed quote'],
      icon: Sparkles,
    };
  }

  return {
    title: 'Standard',
    body: 'Everything needed to run a Scholaroscope workspace.',
    benefits: ['Workspace setup', 'Academic operations', 'Published billing period'],
    icon: CheckCircle2,
  };
}

function selectedPremiumPlugins(
  workspaceType: CommercialWorkspaceType | null,
  selectedIds: number[],
): CommercialPremiumPlugin[] {
  return workspaceType?.premium_plugins.filter((plugin) => selectedIds.includes(plugin.price_id)) ?? [];
}

function capabilityCategoryPreview(workspaceType: CommercialWorkspaceType) {
  const categories = workspaceType.standard.capabilities
    .map((capability) => capability.category || 'Core')
    .filter((category, index, all) => all.indexOf(category) === index);
  return categories.slice(0, 4);
}

function isWorkspaceOnboardingTypeSelectable(item: CommercialWorkspaceType) {
  return item.is_publicly_selectable;
}

export function CommercialRateCards({
  authenticated,
  continueBasePath = '/register',
  workspaceOnboarding = false,
}: CommercialRateCardsProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = authenticated ?? Boolean(user);
  const authResolutionPending = authenticated === undefined && authLoading;
  const catalogQuery = useCommercialCatalog(
    workspaceOnboarding ? { context: 'workspace_onboarding' } : {},
  );
  const quoteMutation = useCommercialQuote();
  const [mode, setMode] = useState<CommercialMode>('STANDARD');
  const [workspaceTypeKey, setWorkspaceTypeKey] = useState<string>('');
  const [selectedPremiumIds, setSelectedPremiumIds] = useState<number[]>([]);
  const [activeStage, setActiveStage] = useState<OnboardingActiveStage>('selection');
  const workspaceSelectionFocusRef = useRef<HTMLDivElement | null>(null);
  const quoteSummaryFocusRef = useRef<HTMLDivElement | null>(null);
  const selectionReturnPendingRef = useRef(false);
  const activeQuoteRequestRef = useRef<{
    key: string;
    promise: Promise<CommercialQuote | null>;
  } | null>(null);

  const workspaceTypes = useMemo(
    () => {
      return catalogQuery.data?.workspace_types ?? [];
    },
    [catalogQuery.data],
  );
  const workspaceType = useMemo(
    () => {
      if (workspaceTypeKey) {
        return workspaceTypes.find((item) => item.key === workspaceTypeKey) ?? null;
      }
      return workspaceOnboarding ? null : workspaceTypes[0] ?? null;
    },
    [workspaceOnboarding, workspaceTypeKey, workspaceTypes],
  );
  const selectedPlugins = useMemo(
    () => selectedPremiumPlugins(workspaceType, selectedPremiumIds),
    [selectedPremiumIds, workspaceType],
  );
  const billingPeriodLabel = catalogQuery.data?.billing_period.description ?? 'Three-month period';
  const workspaceTypeSelectable = !workspaceOnboarding || (workspaceType ? isWorkspaceOnboardingTypeSelectable(workspaceType) : false);
  const premiumUnavailable = mode === 'PREMIUM' && !workspaceType?.premium_available;
  const premiumMissing = mode === 'PREMIUM' && selectedPremiumIds.length === 0;
  const actionDisabled = !workspaceType || !workspaceTypeSelectable || premiumUnavailable || premiumMissing;
  const quoteSummaryActive = workspaceOnboarding && activeStage === 'summary' && Boolean(workspaceType);

  const resetQuote = useCallback(() => {
    activeQuoteRequestRef.current = null;
    if (quoteMutation.data || quoteMutation.isError) {
      quoteMutation.reset();
    }
  }, [quoteMutation]);

  const requestQuote = useCallback(async (
    override?: {
      workspaceType?: CommercialWorkspaceType | null;
      mode?: CommercialMode;
      selectedPremiumIds?: number[];
    },
  ) => {
    const selectedWorkspaceType = override?.workspaceType ?? workspaceType;
    const selectedMode = override?.mode ?? mode;
    const selectedIds = override?.selectedPremiumIds ?? selectedPremiumIds;
    const selectedPremiumUnavailable = selectedMode === 'PREMIUM' && !selectedWorkspaceType?.premium_available;
    const selectedPremiumMissing = selectedMode === 'PREMIUM' && selectedIds.length === 0;
    const selectedActionDisabled = !selectedWorkspaceType || selectedPremiumUnavailable || selectedPremiumMissing;

    if (
      !selectedWorkspaceType
      || selectedActionDisabled
      || (workspaceOnboarding && !isWorkspaceOnboardingTypeSelectable(selectedWorkspaceType))
    ) return null;
    const payload = {
      commercial_mode: selectedMode,
      workspace_type: selectedWorkspaceType.key,
      premium_plugin_price_ids: selectedMode === 'PREMIUM' ? selectedIds : [],
    };
    const quoteRequestKey = JSON.stringify(payload);
    if (activeQuoteRequestRef.current?.key === quoteRequestKey) {
      return activeQuoteRequestRef.current.promise;
    }
    const promise = quoteMutation.mutateAsync(payload).finally(() => {
      if (activeQuoteRequestRef.current?.key === quoteRequestKey) {
        activeQuoteRequestRef.current = null;
      }
    });
    activeQuoteRequestRef.current = {
      key: quoteRequestKey,
      promise,
    };
    return promise;
  }, [mode, quoteMutation, selectedPremiumIds, workspaceOnboarding, workspaceType]);

  const selectWorkspaceType = (item: CommercialWorkspaceType) => {
    if (workspaceOnboarding && !isWorkspaceOnboardingTypeSelectable(item)) {
      return;
    }
    setWorkspaceTypeKey(item.key);
    setMode('STANDARD');
    setSelectedPremiumIds([]);
    resetQuote();
    if (workspaceOnboarding) {
      setActiveStage('summary');
      void requestQuote({
        workspaceType: item,
        mode: 'STANDARD',
        selectedPremiumIds: [],
      });
    }
  };

  const continueToRegistration = async () => {
    if (!workspaceType || actionDisabled) return null;
    const quote = quoteMutation.data ?? await requestQuote();
    if (!quote) return;
    const params = new URLSearchParams({
      quote: quote.token,
      mode: isAuthenticated ? 'new_workspace' : 'signup',
    });
    router.push(`${continueBasePath}?${params.toString()}`);
  };

  const returnToSelection = () => {
    selectionReturnPendingRef.current = true;
    setActiveStage('selection');
  };

  useEffect(() => {
    if (!quoteSummaryActive) {
      return;
    }
    const target = quoteSummaryFocusRef.current;
    if (!target) {
      return;
    }
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    target.focus({ preventScroll: true });
  }, [quoteSummaryActive, quoteMutation.data, quoteMutation.isError, quoteMutation.isPending]);

  useEffect(() => {
    if (activeStage !== 'selection' || !selectionReturnPendingRef.current) {
      return;
    }
    selectionReturnPendingRef.current = false;
    const target = workspaceSelectionFocusRef.current;
    if (!target) {
      return;
    }
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    target.focus({ preventScroll: true });
  }, [activeStage]);

  if (catalogQuery.isLoading) {
    return (
      <section id="commercial-rate-card" className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="rounded-xl border p-10 text-center shadow-sm theme-card">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[color:var(--color-primary)]" />
          <p className="theme-muted">Loading current plans...</p>
        </div>
      </section>
    );
  }

  if (catalogQuery.isError || !catalogQuery.data) {
    return (
      <section id="commercial-rate-card" className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="rounded-xl border p-6 text-sm theme-danger-surface">
          <p className="font-semibold">Plan information is unavailable.</p>
          <p className="mt-2">Try again shortly.</p>
          <button
            type="button"
            className="mt-4 inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold theme-button-primary"
            disabled={catalogQuery.isFetching}
            onClick={() => {
              void catalogQuery.refetch();
            }}
          >
            {catalogQuery.isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </section>
    );
  }

  if (!workspaceType && workspaceTypes.length === 0) {
    return (
      <section id="commercial-rate-card" className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="rounded-xl border p-6 text-sm theme-card theme-muted">
          No public workspace plans are currently available.
        </div>
      </section>
    );
  }

  return (
    <section id="commercial-rate-card" className="mx-auto w-full max-w-[1220px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-4xl">
        <h2 className="mt-3 text-3xl font-bold tracking-tight theme-text sm:text-4xl">
          Get started with the right workspace
        </h2>
        <p className="theme-muted mt-4 text-base leading-7">
          Choose a workspace type first, compare Standard and Premium, then let Scholaroscope confirm the final quote before registration.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div
          ref={workspaceSelectionFocusRef}
          tabIndex={-1}
          className={`space-y-8 ${quoteSummaryActive ? 'hidden lg:block' : ''}`}
          aria-hidden={quoteSummaryActive ? true : undefined}
          aria-labelledby="workspace-type-heading"
        >
          <section aria-labelledby="workspace-type-heading" className="space-y-4">
            <div>
              <p id="workspace-type-heading" className="text-sm font-semibold theme-text">1. Choose workspace type</p>
              <p className="theme-subtle text-sm">Select the setup that matches how your learners and staff work.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workspaceTypes.map((item) => {
                const Icon = workspaceIcons[item.key] ?? Building2;
                const selected = workspaceType?.key === item.key;
                const disabled = workspaceOnboarding
                  ? !isWorkspaceOnboardingTypeSelectable(item)
                  : !item.is_publicly_selectable;
                const categoryPreview = capabilityCategoryPreview(item);
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={disabled ? undefined : selected}
                    disabled={disabled}
                    onClick={() => selectWorkspaceType(item)}
                    className={`min-h-[180px] rounded-xl border p-5 text-left transition ${
                      disabled
                        ? 'theme-card-muted cursor-not-allowed opacity-75'
                        : selected
                        ? 'theme-brand-selected shadow-sm'
                        : 'theme-card theme-hover-surface'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        selected ? 'theme-button-primary' : 'theme-brand-icon'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      {selected ? <CheckCircle2 className="h-5 w-5 text-[color:var(--color-primary)]" /> : null}
                    </div>
                    <h3 className="mt-4 text-base font-bold">{item.name}</h3>
                    <p className="theme-muted mt-2 line-clamp-3 text-sm leading-6">{item.description}</p>
                    <p className="mt-5 text-2xl font-bold">{formatMoney(item.standard.price, item.standard.currency)}</p>
                    <p className="theme-subtle text-xs">{billingPeriodLabel}</p>
                    {disabled ? (
                      <span className="mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide theme-border theme-subtle">
                        Coming soon
                      </span>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {categoryPreview.slice(0, 3).map((category) => (
                        <span key={category} className="rounded-full px-2 py-1 text-xs font-medium theme-card-muted theme-muted">
                          {category}
                        </span>
                      ))}
                    </div>
                    <span className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${
                      disabled ? 'theme-subtle' : 'text-[color:var(--color-primary)]'
                    }`}>
                      {disabled ? 'Unavailable for onboarding' : selected ? 'Selected workspace' : 'Choose this workspace'}
                      {!disabled ? <ArrowRight className="h-4 w-4" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {workspaceType ? (
            <>
          <section aria-labelledby="plan-experience-heading" className="space-y-4">
            <div>
              <p id="plan-experience-heading" className="text-sm font-semibold theme-text">2. Compare Standard and Premium</p>
              <p className="theme-subtle text-sm">Premium is the Standard foundation plus the premium capabilities you select.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2" role="tablist" aria-label="Plan mode">
              {catalogQuery.data.rate_cards.map((rateCard) => {
                const copy = planCopy(rateCard.mode);
                const Icon = copy.icon;
                const selected = mode === rateCard.mode;
                const premiumCard = rateCard.mode === 'PREMIUM';
                const disabled = premiumCard && !workspaceType.premium_available;
                return (
                  <button
                    key={rateCard.mode}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    disabled={disabled}
                    onClick={() => {
                      setMode(rateCard.mode);
                      if (rateCard.mode === 'STANDARD') setSelectedPremiumIds([]);
                      resetQuote();
                      if (workspaceOnboarding) setActiveStage('selection');
                    }}
                    className={`min-h-[215px] rounded-xl border p-6 text-left transition ${
                      selected
                        ? 'theme-brand-selected shadow-sm'
                        : 'theme-card theme-hover-surface'
                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                        selected ? 'theme-button-primary' : 'theme-brand-icon'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        selected ? 'theme-button-primary' : 'theme-border'
                      }`}>
                        {selected ? <CheckCircle2 className="h-4 w-4" /> : null}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold">{copy.title}</h3>
                    <p className="mt-2 text-sm leading-6 theme-muted">
                      {premiumCard ? 'Standard foundation plus selected premium capabilities.' : rateCard.summary || copy.body}
                    </p>
                    <p className="mt-5 text-2xl font-bold">
                      {premiumCard ? `From ${formatMoney(workspaceType.standard.price, workspaceType.standard.currency)}` : formatMoney(workspaceType.standard.price, workspaceType.standard.currency)}
                    </p>
                    <p className="theme-subtle text-xs">
                      {premiumCard ? 'Premium selections are added in the next step' : billingPeriodLabel}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {copy.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="capabilities-heading" className="rounded-xl border p-6 shadow-sm theme-card">
            <div className="mb-5">
              <p className="text-sm font-semibold theme-text">Included in Standard</p>
              <p className="theme-subtle mt-1 text-sm">{workspaceType.name} Standard foundation.</p>
            </div>
            <CapabilityList capabilities={workspaceType.standard.capabilities} />
          </section>

          {mode === 'PREMIUM' ? (
            <section aria-labelledby="premium-plugins-heading" className="rounded-xl border p-6 shadow-sm theme-card">
              <div className="mb-5">
                <p className="text-sm font-semibold theme-text">3. Choose premium capabilities</p>
                <p className="theme-subtle mt-1 text-sm">Choose only the premium curriculum or specialist capabilities you need.</p>
              </div>
              <PremiumPluginSelector
                plugins={workspaceType.premium_plugins}
                selectedIds={selectedPremiumIds}
                disabled={!workspaceType.premium_available}
                onToggle={(priceId) => {
                  setSelectedPremiumIds((current) => (
                    current.includes(priceId)
                      ? current.filter((id) => id !== priceId)
                      : [...current, priceId]
                  ));
                  resetQuote();
                }}
              />
              {premiumUnavailable ? (
                <p className="mt-4 flex items-center gap-2 rounded-lg p-3 text-sm theme-warning-surface">
                  <AlertCircle className="h-4 w-4" />
                  Premium is not currently available for this workspace type.
                </p>
              ) : null}
            </section>
          ) : (
            <section aria-labelledby="premium-standard-heading" className="rounded-xl border border-dashed p-6 theme-card">
              <p id="premium-standard-heading" className="text-sm font-semibold theme-text">3. Premium capabilities</p>
              <p className="theme-muted mt-2 text-sm leading-6">
                Standard is selected. Choose Premium above if you want to add specialist capabilities before requesting a quote.
              </p>
            </section>
          )}
            </>
          ) : (
            <section className="rounded-xl border border-dashed p-6 theme-card">
              <p className="text-sm font-semibold theme-text">Select a workspace to continue</p>
              <p className="theme-muted mt-2 text-sm leading-6">
                Choose an available workspace option above to request and review a backend-confirmed quote.
              </p>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <div className="sr-only" role="status" aria-live="polite">
            {quoteSummaryActive ? 'Quote summary is now active.' : 'Workspace selection is now active.'}
          </div>
          <div className="rounded-xl border p-5 shadow-sm theme-card">
            <p className="text-sm font-semibold theme-text">4. Request and review your quote</p>
            <p className="theme-muted mt-2 text-sm leading-6">
              Scholaroscope confirms the final total from your selected workspace, plan, and premium capabilities.
            </p>
          </div>
          {quoteMutation.isError ? (
            <div className="rounded-xl border p-4 text-sm theme-danger-surface">
              Could not create a quote. Review the selected workspace type and premium capabilities.
            </div>
          ) : null}
          <div
            ref={quoteSummaryFocusRef}
            tabIndex={-1}
            aria-labelledby="commercial-quote-summary-heading"
            className="scroll-mt-24 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
          >
            <CommercialQuoteSummary
              workspaceType={workspaceType}
              mode={mode}
              selectedPlugins={selectedPlugins}
              quote={quoteMutation.data ?? null}
              loading={quoteMutation.isPending}
              billingPeriodLabel={billingPeriodLabel}
              authenticated={isAuthenticated}
              disabled={actionDisabled || authResolutionPending}
              onQuote={() => {
                if (workspaceOnboarding) setActiveStage('summary');
                void requestQuote();
              }}
              onContinue={() => void continueToRegistration()}
              onChangeWorkspace={workspaceOnboarding && workspaceType ? returnToSelection : undefined}
            />
          </div>
          <div className="rounded-xl border p-5 shadow-sm theme-card">
            <p className="text-sm font-semibold theme-text">5. Continue to registration</p>
            <p className="theme-muted mt-2 text-sm leading-6">
              After the quote is confirmed, continue with the quote token attached to your registration.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
