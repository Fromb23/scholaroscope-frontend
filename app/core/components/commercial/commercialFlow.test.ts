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
const commercialApiSource = readFileSync(
  join(process.cwd(), 'app/core/api/commercialCatalog.ts'),
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
    expect(landingSource).toContain('<CommercialRateCards');
    expect(commercialApiSource).toContain("'/subscriptions/catalog/'");
    expect(commercialApiSource).toContain("'/subscriptions/catalog/quote/'");
    expect(commercialSource).toContain('Premium is Standard plus selected premium plugins');
    expect(commercialSource).toContain('premium_plugin_price_ids');
    expect(commercialSource).not.toContain('total =');
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
