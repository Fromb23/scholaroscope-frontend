import { parseAppDestination } from '@/app/core/auth/navigation';

export function buildPortfolioSourceRecordHref({
  sourceHref,
  portfolioHref,
}: {
  sourceHref: string | null | undefined;
  portfolioHref: string | null | undefined;
}): string | null {
  const safeSourceHref = parseAppDestination(sourceHref);
  const safePortfolioHref = parseAppDestination(portfolioHref);

  if (!safeSourceHref || !safePortfolioHref) {
    return null;
  }

  const parsed = new URL(safeSourceHref, 'https://scholaroscope.local');
  parsed.searchParams.set('returnTo', safePortfolioHref);

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
