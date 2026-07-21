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
  join(process.cwd(), 'app/core/components/public/WorkflowSection.tsx'),
  'utf8',
);
const problemSource = readFileSync(
  join(process.cwd(), 'app/core/components/public/ProblemSection.tsx'),
  'utf8',
);
const evidenceDashboardSource = readFileSync(
  join(process.cwd(), 'app/core/components/public/ProductPreviewSection.tsx'),
  'utf8',
);
const reportAudienceSource = readFileSync(
  join(process.cwd(), 'app/core/components/public/AudienceSection.tsx'),
  'utf8',
);
const evidenceIntegritySource = readFileSync(
  join(process.cwd(), 'app/core/components/public/TrustSection.tsx'),
  'utf8',
);
const footerCtaSource = readFileSync(
  join(process.cwd(), 'app/core/components/public/FinalCtaSection.tsx'),
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
      problemSource,
      howItWorksSource,
      evidenceDashboardSource,
      reportAudienceSource,
      audienceSource,
      evidenceIntegritySource,
      commercialSectionSource,
      footerCtaSource,
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
    expect(commercialSectionSource).toContain('Start with what you need. Add capabilities as you grow.');
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

  it('uses the product-focused public landing hierarchy', () => {
    const order = [
      '<PublicHeader',
      '<HeroSection',
      '<ProblemSection',
      '<WorkflowSection',
      '<ProductPreviewSection',
      '<AudienceSection',
      '<TrustSection',
      '<FaqSection',
      '<FinalCtaSection',
      '<PublicFooter',
    ];
    for (let index = 0; index < order.length - 1; index += 1) {
      expect(landingSource.indexOf(order[index])).toBeLessThan(landingSource.indexOf(order[index + 1]));
    }

    expect(heroSource).toContain('Stop reconstructing learner progress from memory.');
    expect(heroSource).toContain('href="/get-started"');
    expect(heroSource).toContain('href="#how-it-works"');
    expect(landingSource).toContain('<FaqSection');
    expect(landingSource).not.toContain('<HowItWorksSection');
    expect(landingSource).not.toContain('<EvidenceDashboardSection');
    expect(landingSource).not.toContain('<ReportAudienceSection');
    expect(landingSource).not.toContain('<EvidenceIntegritySection');
    expect(landingSource).not.toContain('<CommercialSection');
    expect(landingSource).not.toContain('<FooterCtaSection');
    expect(problemSource).toContain('The problem is not that teachers lack records.');
    expect(howItWorksSource).toContain('How Scholaroscope works');
    expect(evidenceDashboardSource).toContain('Product proof, not vague promises');
    expect(reportAudienceSource).toContain('For independent teachers');
    expect(audienceSource).toContain('For schools and learning centres');
    expect(evidenceIntegritySource).toContain('Built from real classroom workflow in Kenya.');
    expect(footerCtaSource).toContain('Build progress reviews from the teaching record.');
  });

  it('does not publish unsupported public claims on the landing page', () => {
    const publicCopy = [
      heroSource,
      problemSource,
      evidenceDashboardSource,
      reportAudienceSource,
      audienceSource,
      evidenceIntegritySource,
      commercialSectionSource,
      footerCtaSource,
    ].join('\n');

    expect(publicCopy).not.toMatch(/KNEC|KICD|Ministry approved|Ministry-certified|Cambridge aligned|30,000|government software/i);
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
