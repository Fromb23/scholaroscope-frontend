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
const commercialWorkspaceOnboardingSource = readFileSync(
  join(process.cwd(), 'app/core/components/commercial/CommercialWorkspaceOnboardingPage.tsx'),
  'utf8',
);
const premiumPluginSelectorSource = readFileSync(
  join(process.cwd(), 'app/core/components/commercial/PremiumPluginSelector.tsx'),
  'utf8',
);
const capabilityListSource = readFileSync(
  join(process.cwd(), 'app/core/components/commercial/CapabilityList.tsx'),
  'utf8',
);
const publicHeaderSource = readFileSync(
  join(process.cwd(), 'app/core/components/public/PublicHeader.tsx'),
  'utf8',
);
const heroSource = readFileSync(
  join(process.cwd(), 'app/core/components/public/HeroSection.tsx'),
  'utf8',
);
const howItWorksSource = readFileSync(
  join(process.cwd(), 'app/core/components/public/HowItWorksSection.tsx'),
  'utf8',
);
const featureSource = readFileSync(
  join(process.cwd(), 'app/core/components/public/FeatureSection.tsx'),
  'utf8',
);
const audienceSource = readFileSync(
  join(process.cwd(), 'app/core/components/public/AudienceSection.tsx'),
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
const getStartedComponentSource = readFileSync(
  join(process.cwd(), 'app/core/components/commercial/PublicGetStartedPage.tsx'),
  'utf8',
);
const publicFooterSource = readFileSync(
  join(process.cwd(), 'app/core/components/public/PublicFooter.tsx'),
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
  it('uses theme-safe surfaces on public landing and get-started components', () => {
    const publicSources = [
      landingSource,
      getStartedComponentSource,
      commercialWorkspaceOnboardingSource,
      publicHeaderSource,
      heroSource,
      howItWorksSource,
      featureSource,
      audienceSource,
      commercialSectionSource,
      publicFooterSource,
      commercialSource,
      commercialSummarySource,
      premiumPluginSelectorSource,
      capabilityListSource,
    ];
    const lightOnlyTokens = [
      'bg' + '-white',
      'bg' + '-slate-50',
      'text' + '-slate-950',
      'text' + '-slate-600',
      'border' + '-slate-300',
      'hover:bg' + '-slate-100',
    ];
    const lightOnlyToken = new RegExp(`(?:^|\\s)(${lightOnlyTokens.join('|')})(?:\\s|["'\`])`);

    expect(landingSource).toContain('theme-app-bg theme-text');
    expect(getStartedComponentSource).toContain('theme-app-bg theme-text');
    expect(publicHeaderSource).toContain('PublicThemeToggle');
    expect(commercialSectionSource).toContain('href="/get-started"');

    for (const source of publicSources) {
      expect(source).not.toMatch(lightOnlyToken);
    }
  });

  it('loads public rate cards from the backend and quotes before registration', () => {
    expect(landingSource).toContain('<CommercialSection');
    expect(getStartedPageSource).toContain('<PublicGetStartedPage');
    expect(getStartedComponentSource).toContain('<CommercialRateCards');
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
