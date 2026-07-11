'use client';

import { useMemo, useState } from 'react';
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

import { useCommercialCatalog, useCommercialQuote } from '@/app/core/hooks/useCommercialCatalog';
import type {
  CommercialMode,
  CommercialPremiumPlugin,
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
}

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

export function CommercialRateCards({
  authenticated = false,
  continueBasePath = '/register',
}: CommercialRateCardsProps) {
  const router = useRouter();
  const catalogQuery = useCommercialCatalog();
  const quoteMutation = useCommercialQuote();
  const [mode, setMode] = useState<CommercialMode>('STANDARD');
  const [workspaceTypeKey, setWorkspaceTypeKey] = useState<string>('');
  const [selectedPremiumIds, setSelectedPremiumIds] = useState<number[]>([]);

  const workspaceTypes = useMemo(
    () => catalogQuery.data?.workspace_types ?? [],
    [catalogQuery.data],
  );
  const workspaceType = useMemo(
    () => workspaceTypes.find((item) => item.key === workspaceTypeKey) ?? workspaceTypes[0] ?? null,
    [workspaceTypeKey, workspaceTypes],
  );
  const selectedPlugins = useMemo(
    () => selectedPremiumPlugins(workspaceType, selectedPremiumIds),
    [selectedPremiumIds, workspaceType],
  );
  const billingPeriodLabel = catalogQuery.data?.billing_period.description ?? 'Three-month period';
  const premiumUnavailable = mode === 'PREMIUM' && !workspaceType?.premium_available;
  const premiumMissing = mode === 'PREMIUM' && selectedPremiumIds.length === 0;
  const actionDisabled = !workspaceType || premiumUnavailable || premiumMissing;

  const resetQuote = () => {
    if (quoteMutation.data || quoteMutation.isError) {
      quoteMutation.reset();
    }
  };

  const requestQuote = async () => {
    if (!workspaceType || actionDisabled) return null;
    return quoteMutation.mutateAsync({
      commercial_mode: mode,
      workspace_type: workspaceType.key,
      premium_plugin_price_ids: mode === 'PREMIUM' ? selectedPremiumIds : [],
    });
  };

  const continueToRegistration = async () => {
    const quote = quoteMutation.data ?? await requestQuote();
    if (!quote) return;
    const params = new URLSearchParams({
      quote: quote.token,
      mode: authenticated ? 'new_workspace' : 'signup',
    });
    router.push(`${continueBasePath}?${params.toString()}`);
  };

  if (catalogQuery.isLoading) {
    return (
      <section id="commercial-rate-card" className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="rounded-xl border bg-white p-10 text-center shadow-sm theme-border">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-blue-600" />
          <p className="theme-muted">Loading current plans...</p>
        </div>
      </section>
    );
  }

  if (catalogQuery.isError || !catalogQuery.data) {
    return (
      <section id="commercial-rate-card" className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          Plan information is unavailable. Try again shortly.
        </div>
      </section>
    );
  }

  if (!workspaceType) {
    return (
      <section id="commercial-rate-card" className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="rounded-xl border bg-white p-6 text-sm theme-border theme-muted">
          No public workspace plans are currently available.
        </div>
      </section>
    );
  }

  return (
    <section id="commercial-rate-card" className="mx-auto w-full max-w-[1220px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-4xl">
        <p className="text-sm font-semibold text-blue-700">Plans and quote</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight theme-text sm:text-4xl">
          Get started with the right workspace
        </h2>
        <p className="theme-muted mt-4 text-base leading-7">
          Choose a workspace type first, compare Standard and Premium, then let Scholaroscope confirm the final quote before registration.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <section aria-labelledby="workspace-type-heading" className="space-y-4">
            <div>
              <p className="text-sm font-semibold theme-text">1. Choose workspace type</p>
              <p className="theme-subtle text-sm">Select the setup that matches how your learners and staff work.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workspaceTypes.map((item) => {
                const Icon = workspaceIcons[item.key] ?? Building2;
                const selected = workspaceType.key === item.key;
                const categoryPreview = capabilityCategoryPreview(item);
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setWorkspaceTypeKey(item.key);
                      setSelectedPremiumIds([]);
                      resetQuote();
                    }}
                    className={`min-h-[180px] rounded-xl border p-5 text-left transition ${
                      selected
                        ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-sm'
                        : 'bg-white theme-border theme-hover-surface theme-text'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      {selected ? <CheckCircle2 className="h-5 w-5 text-blue-700" /> : null}
                    </div>
                    <h3 className="mt-4 text-base font-bold">{item.name}</h3>
                    <p className="theme-muted mt-2 line-clamp-3 text-sm leading-6">{item.description}</p>
                    <p className="mt-5 text-2xl font-bold">{formatMoney(item.standard.price, item.standard.currency)}</p>
                    <p className="theme-subtle text-xs">{billingPeriodLabel}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {categoryPreview.slice(0, 3).map((category) => (
                        <span key={category} className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-slate-600">
                          {category}
                        </span>
                      ))}
                    </div>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                      {selected ? 'Selected workspace' : 'Choose this workspace'}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="plan-experience-heading" className="space-y-4">
            <div>
              <p className="text-sm font-semibold theme-text">2. Compare Standard and Premium</p>
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
                    }}
                    className={`min-h-[215px] rounded-xl border p-6 text-left transition ${
                      selected
                        ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-sm'
                        : 'bg-white theme-border theme-hover-surface theme-text'
                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                        selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        selected ? 'border-blue-600 bg-blue-600 text-white' : 'theme-border'
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
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="capabilities-heading" className="rounded-xl border bg-white p-6 shadow-sm theme-border">
            <div className="mb-5">
              <p className="text-sm font-semibold theme-text">Included in Standard</p>
              <p className="theme-subtle mt-1 text-sm">{workspaceType.name} Standard foundation.</p>
            </div>
            <CapabilityList capabilities={workspaceType.standard.capabilities} />
          </section>

          {mode === 'PREMIUM' ? (
            <section aria-labelledby="premium-plugins-heading" className="rounded-xl border bg-white p-6 shadow-sm theme-border">
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
                <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  Premium is not currently available for this workspace type.
                </p>
              ) : null}
            </section>
          ) : (
            <section aria-labelledby="premium-standard-heading" className="rounded-xl border border-dashed bg-white p-6 theme-border">
              <p id="premium-standard-heading" className="text-sm font-semibold theme-text">3. Premium capabilities</p>
              <p className="theme-muted mt-2 text-sm leading-6">
                Standard is selected. Choose Premium above if you want to add specialist capabilities before requesting a quote.
              </p>
            </section>
          )}

          {quoteMutation.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Could not create a quote. Review the selected workspace type and premium capabilities.
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm theme-border">
            <p className="text-sm font-semibold theme-text">4. Request and review your quote</p>
            <p className="theme-muted mt-2 text-sm leading-6">
              Scholaroscope confirms the final total from your selected workspace, plan, and premium capabilities.
            </p>
          </div>
          <CommercialQuoteSummary
            workspaceType={workspaceType}
            mode={mode}
            selectedPlugins={selectedPlugins}
            quote={quoteMutation.data ?? null}
            loading={quoteMutation.isPending}
            billingPeriodLabel={billingPeriodLabel}
            authenticated={authenticated}
            disabled={actionDisabled}
            onQuote={() => void requestQuote()}
            onContinue={() => void continueToRegistration()}
          />
          <div className="rounded-xl border bg-white p-5 shadow-sm theme-border">
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
