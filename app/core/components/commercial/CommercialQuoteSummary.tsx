import type { CommercialQuote } from '@/app/core/types/commercialCatalog';

interface CommercialQuoteSummaryProps {
  quote: CommercialQuote | null;
  loading?: boolean;
}

export function CommercialQuoteSummary({ quote, loading = false }: CommercialQuoteSummaryProps) {
  if (loading) {
    return <div className="rounded-md border theme-border p-4 text-sm theme-muted">Requesting server quote...</div>;
  }
  if (!quote) {
    return <div className="rounded-md border theme-border p-4 text-sm theme-muted">Select a workspace type and quote the order.</div>;
  }
  return (
    <div className="rounded-md border theme-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold theme-text">Server quote</p>
          <p className="theme-subtle text-xs">
            {quote.starts_on} to {quote.ends_on}. Expires {new Date(quote.expires_at).toLocaleTimeString()}.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold theme-text">{quote.currency} {quote.total}</p>
          <p className="theme-subtle text-xs">
            Standard {quote.base_price}
            {quote.premium_total !== '0.00' ? ` + premium ${quote.premium_total}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
