import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const landingSource = readFileSync(
  join(process.cwd(), 'app/core/components/root/LandingPage.tsx'),
  'utf8',
);
const commercialSource = readFileSync(
  join(process.cwd(), 'app/core/components/commercial/CommercialRateCards.tsx'),
  'utf8',
);
const commercialSummarySource = readFileSync(
  join(process.cwd(), 'app/core/components/commercial/CommercialQuoteSummary.tsx'),
  'utf8',
);
const commercialSectionSource = readFileSync(
  join(process.cwd(), 'app/core/components/public/CommercialSection.tsx'),
  'utf8',
);
const getStartedPageSource = readFileSync(
  join(process.cwd(), 'app/get-started/page.tsx'),
  'utf8',
);
const commercialApiSource = readFileSync(
  join(process.cwd(), 'app/core/api/commercialCatalog.ts'),
  'utf8',
);
const moneySource = readFileSync(
  join(process.cwd(), 'app/core/lib/money.ts'),
  'utf8',
);
const registerHookSource = readFileSync(
  join(process.cwd(), 'app/core/hooks/useRegister.ts'),
  'utf8',
);
const headerSource = readFileSync(
  join(process.cwd(), 'app/components/layout/Header.tsx'),
  'utf8',
);

describe('commercial onboarding contract', () => {
  it('loads public rate cards from the backend and quotes before registration', () => {
    expect(landingSource).toContain('<CommercialSection');
    expect(getStartedPageSource).toContain('<CommercialRateCards');
    expect(commercialApiSource).toContain("'/subscriptions/catalog/'");
    expect(commercialApiSource).toContain("'/subscriptions/catalog/quote/'");
    expect(commercialSource).toContain('Start with Standard and add only the premium curriculum or specialist capabilities you need.');
    expect(commercialSource).toContain('premium_plugin_price_ids');
    expect(commercialSource).not.toContain('total =');
  });

  it('keeps public landing marketing separate from the detailed plan flow', () => {
    expect(commercialSectionSource).toContain('href="/get-started"');
    expect(commercialSectionSource).not.toContain('CommercialRateCards');
    expect(commercialSectionSource).toContain('Pick the workspace first, then compare plans');
    expect(commercialSource).toContain('Get started with the right workspace');
    expect(commercialSource).toContain('1. Choose workspace type');
    expect(commercialSource).toContain('2. Compare Standard and Premium');
    expect(commercialSource).toContain('3. Choose premium capabilities');
    expect(commercialSource.indexOf('1. Choose workspace type')).toBeLessThan(
      commercialSource.indexOf('2. Compare Standard and Premium'),
    );
    expect(commercialSource).toContain('workspaceTypes.map');
    expect(commercialSource).not.toMatch(/KES\s?\d/);
    expect(commercialSource).not.toMatch(/price\s*=\s*['"`]\d/);
    expect(commercialSummarySource).toContain("quote ? formatMoney(quote.total, quote.currency) : 'Confirm quote'");
    expect(commercialSummarySource).not.toContain('premiumTotal');
    expect(moneySource).toContain('Intl.NumberFormat');
    expect(moneySource).toContain('minimumFractionDigits: hasFraction ? 2 : 0');
  });

  it('requires quote tokens for owner-created registration while preserving invite bypass', () => {
    expect(registerHookSource).toContain('quoteToken');
    expect(registerHookSource).toContain('Commercial quote required');
    expect(registerHookSource).toContain('invite_code: inviteToken');
    expect(registerHookSource).toContain('quote_token: quoteToken');
  });

  it('routes workspace switcher creation through commercial onboarding', () => {
    expect(headerSource).toContain("router.push('/workspaces/new')");
    expect(headerSource).not.toContain("router.push('/register?mode=new_workspace')");
  });
});
