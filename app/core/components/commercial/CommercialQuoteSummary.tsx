import { CalendarDays, CheckCircle2, Loader2 } from 'lucide-react';

import type {
  CommercialMode,
  CommercialPremiumPlugin,
  CommercialQuote,
  CommercialWorkspaceType,
} from '@/app/core/types/commercialCatalog';
import { Button } from '@/app/components/ui/Button';
import { formatMoney } from '@/app/core/lib/money';

interface CommercialQuoteSummaryProps {
  workspaceType: CommercialWorkspaceType | null;
  mode: CommercialMode;
  selectedPlugins: CommercialPremiumPlugin[];
  quote: CommercialQuote | null;
  loading?: boolean;
  billingPeriodLabel: string;
  authenticated?: boolean;
  disabled?: boolean;
  onQuote: () => void;
  onContinue: () => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function CommercialQuoteSummary({
  workspaceType,
  mode,
  selectedPlugins,
  quote,
  loading = false,
  billingPeriodLabel,
  authenticated = false,
  disabled = false,
  onQuote,
  onContinue,
}: CommercialQuoteSummaryProps) {
  const basePrice = workspaceType?.standard.price ?? '0';
  const currency = workspaceType?.standard.currency ?? quote?.currency ?? 'KES';
  const ctaLabel = mode === 'PREMIUM' && selectedPlugins.length === 0
    ? 'Select a premium capability'
    : quote
      ? authenticated ? 'Create this workspace' : 'Create account'
      : 'Confirm price and continue';

  return (
    <aside className="sticky top-24 rounded-xl border bg-white p-5 shadow-sm theme-border">
      <div className="border-b pb-4 theme-border">
        <p className="text-sm font-semibold theme-text">Order summary</p>
        <p className="theme-subtle mt-1 text-xs">Backend quote remains the price authority.</p>
      </div>

      <div className="space-y-4 py-5">
        <div>
          <p className="theme-subtle text-xs font-semibold uppercase tracking-wide">Workspace type</p>
          <p className="mt-1 text-sm font-semibold theme-text">{workspaceType?.name ?? 'Select a workspace'}</p>
        </div>
        <div>
          <p className="theme-subtle text-xs font-semibold uppercase tracking-wide">Plan experience</p>
          <p className="mt-1 text-sm font-semibold theme-text">
            {mode === 'PREMIUM' ? 'Standard + Premium' : 'Standard'}
          </p>
        </div>

        {mode === 'PREMIUM' ? (
          <div>
            <p className="theme-subtle text-xs font-semibold uppercase tracking-wide">Premium selections</p>
            {selectedPlugins.length > 0 ? (
              <div className="mt-2 space-y-2">
                {selectedPlugins.map((plugin) => (
                  <div key={plugin.price_id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="theme-text">{plugin.plugin_name}</span>
                    <span className="font-semibold theme-text">{formatMoney(plugin.price, plugin.currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-amber-700">Select at least one premium capability.</p>
            )}
          </div>
        ) : null}

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CalendarDays className="h-4 w-4" />
            {billingPeriodLabel}
          </div>
          {quote ? (
            <p className="mt-2 text-xs text-slate-500">
              {formatDate(quote.starts_on)} to {formatDate(quote.ends_on)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 border-t pt-4 theme-border">
          <div className="flex justify-between text-sm">
            <span className="theme-muted">Base price</span>
            <span className="font-semibold theme-text">{formatMoney(quote?.base_price ?? basePrice, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="theme-muted">{quote ? 'Premium total' : 'Premium selections'}</span>
            <span className="font-semibold theme-text">
              {quote ? formatMoney(quote.premium_total, quote.currency) : selectedPlugins.length ? `${selectedPlugins.length} selected` : 'None'}
            </span>
          </div>
          <div className="flex items-end justify-between border-t pt-3 theme-border">
            <span className="text-sm font-semibold theme-text">{quote ? 'Backend-confirmed total' : 'Total'}</span>
            <span className="text-2xl font-bold theme-text">
              {quote ? formatMoney(quote.total, quote.currency) : 'Confirm quote'}
            </span>
          </div>
        </div>

        {quote ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Server quote confirmed
            </p>
            <p className="mt-1 text-xs">Expires {formatDate(quote.expires_at)}.</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          className="w-full"
          disabled={disabled || loading}
          onClick={quote ? onContinue : onQuote}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming quote...
            </>
          ) : ctaLabel}
        </Button>
        {quote ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loading}
            onClick={onQuote}
          >
            Refresh quote
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
