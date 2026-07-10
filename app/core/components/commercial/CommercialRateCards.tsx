import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Building2, CreditCard, Loader2 } from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { useCommercialCatalog, useCommercialQuote } from '@/app/core/hooks/useCommercialCatalog';
import type { CommercialMode, CommercialWorkspaceType } from '@/app/core/types/commercialCatalog';
import { CapabilityList } from './CapabilityList';
import { CommercialQuoteSummary } from './CommercialQuoteSummary';
import { PremiumPluginSelector } from './PremiumPluginSelector';

interface CommercialRateCardsProps {
  authenticated?: boolean;
  continueBasePath?: string;
}

function formatPrice(workspaceType: CommercialWorkspaceType | undefined) {
  if (!workspaceType) return '';
  return `${workspaceType.standard.currency} ${workspaceType.standard.price}`;
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
    [catalogQuery.data]
  );
  const workspaceType = useMemo(
    () => workspaceTypes.find((item) => item.key === workspaceTypeKey) ?? workspaceTypes[0],
    [workspaceTypeKey, workspaceTypes]
  );
  const resolvedWorkspaceTypeKey = workspaceType?.key ?? '';
  const premiumUnavailable = mode === 'PREMIUM' && !workspaceType?.premium_available;
  const premiumMissing = mode === 'PREMIUM' && selectedPremiumIds.length === 0;

  const requestQuote = async () => {
    if (!workspaceType || premiumUnavailable || premiumMissing) return null;
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
      <section id="commercial-rate-card" className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="rounded-md border theme-border p-8 text-center theme-muted">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
          Loading current commercial catalogue...
        </div>
      </section>
    );
  }

  if (catalogQuery.isError || !catalogQuery.data) {
    return (
      <section id="commercial-rate-card" className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="rounded-md border border-red-300 bg-red-50 p-5 text-sm text-red-700">
          Commercial catalogue is unavailable. Try again shortly.
        </div>
      </section>
    );
  }

  if (!workspaceType) {
    return (
      <section id="commercial-rate-card" className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="rounded-md border theme-border p-5 text-sm theme-muted">
          No public workspace plans are currently available.
        </div>
      </section>
    );
  }

  return (
    <section id="commercial-rate-card" className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-6">
        <p className="text-sm font-semibold text-blue-500">Commercial workspace setup</p>
        <h2 className="mt-2 text-2xl font-bold theme-text">Choose Standard or Premium</h2>
        <p className="theme-muted mt-1 text-sm">
          Premium is Standard plus selected premium plugins. Prices and capabilities come from the backend catalogue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {catalogQuery.data.rate_cards.map((rateCard) => {
          const selected = mode === rateCard.mode;
          return (
            <button
              key={rateCard.mode}
              type="button"
              onClick={() => {
                setMode(rateCard.mode);
                if (rateCard.mode === 'STANDARD') setSelectedPremiumIds([]);
              }}
              className={`rounded-md border p-5 text-left transition ${
                selected ? 'border-blue-500 bg-blue-500/10' : 'theme-border theme-hover-surface'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-lg font-semibold theme-text">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  {rateCard.name}
                </p>
                <span className="theme-subtle text-xs">{rateCard.requires_premium_plugin ? 'Plugin selection required' : 'No premium plugin'}</span>
              </div>
              <p className="theme-muted mt-2 text-sm">{rateCard.summary}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-md border theme-border p-5">
        <label className="text-sm font-semibold theme-text" htmlFor="commercial-workspace-type">
          Workspace type
        </label>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {workspaceTypes.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setWorkspaceTypeKey(item.key);
                setSelectedPremiumIds([]);
              }}
              className={`rounded-md border p-4 text-left ${
                resolvedWorkspaceTypeKey === item.key ? 'border-blue-500 bg-blue-500/10' : 'theme-border theme-hover-surface'
              }`}
            >
              <p className="flex items-center gap-2 text-sm font-semibold theme-text">
                <Building2 className="h-4 w-4" />
                {item.name}
              </p>
              <p className="theme-subtle mt-1 text-xs">{item.description}</p>
              <p className="mt-3 text-sm font-semibold theme-text">
                {item.standard.currency} {item.standard.price}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-md border theme-border p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold theme-text">{workspaceType.name} Standard foundation</h3>
            <p className="theme-muted text-sm">
              {catalogQuery.data.billing_period.description}: {formatPrice(workspaceType)}
            </p>
          </div>
        </div>
        <CapabilityList capabilities={workspaceType.standard.capabilities} />
      </div>

      {mode === 'PREMIUM' ? (
        <div className="mt-6 rounded-md border theme-border p-5">
          <h3 className="text-lg font-semibold theme-text">Selected premium plugins</h3>
          <p className="theme-muted mb-4 text-sm">Choose at least one available premium plugin for this workspace type.</p>
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
            }}
          />
          {premiumUnavailable ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Premium mode is unavailable for this workspace type because no active premium plugin prices are published.
            </p>
          ) : null}
          {premiumMissing && !premiumUnavailable ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Select at least one premium plugin before continuing.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <CommercialQuoteSummary quote={quoteMutation.data ?? null} loading={quoteMutation.isPending} />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            disabled={quoteMutation.isPending || premiumUnavailable || premiumMissing}
            onClick={() => void requestQuote()}
          >
            Quote total
          </Button>
          <Button
            disabled={quoteMutation.isPending || premiumUnavailable || premiumMissing}
            onClick={() => void continueToRegistration()}
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
      {quoteMutation.isError ? (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Could not create quote. Review the selected workspace type and premium plugins.
        </div>
      ) : null}
    </section>
  );
}
