import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceFor = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('PublicHeader variants and Scholaroscope logo', () => {
  it('uses landing-local section URLs only in the landing variant', () => {
    const headerSource = sourceFor('app/core/components/public/PublicHeader.tsx');
    const landingSource = sourceFor('app/core/components/root/LandingPage.tsx');

    expect(landingSource).toContain('<PublicHeader variant="landing"');
    expect(headerSource).toContain("variant?: 'landing' | 'minimal'");
    expect(headerSource).toContain("href: '/#product'");
    expect(headerSource).toContain("href: '/#how-it-works'");
    expect(headerSource).toContain("href: '/#for-teachers'");
    expect(headerSource).toContain("href: '/#for-schools'");
    expect(headerSource).toContain("href: '/#faq'");
    expect(headerSource).toContain('onClick={() => setMenuOpen(false)}');
  });

  it('uses a minimal get-started header without landing navigation links', () => {
    const getStartedSource = sourceFor('app/core/components/commercial/PublicGetStartedPage.tsx');
    const headerSource = sourceFor('app/core/components/public/PublicHeader.tsx');

    expect(getStartedSource).toContain('<PublicHeader variant="minimal"');
    expect(headerSource).toContain('const landingVariant = variant === \'landing\'');
    expect(headerSource).toContain('{landingVariant ? (');
    expect(headerSource).toContain('{landingVariant && menuOpen ? (');
    expect(headerSource).toContain('{!landingVariant ? <PublicThemeToggle /> : null}');
  });

  it('centralizes logo navigation on a native clean home anchor', () => {
    const logoSource = sourceFor('app/core/components/public/ScholaroscopeHomeLogo.tsx');
    const headerSource = sourceFor('app/core/components/public/PublicHeader.tsx');
    const loginSource = sourceFor('app/core/components/auth/LoginPage.tsx');
    const registerSource = sourceFor('app/core/components/auth/RegisterPage.tsx');

    expect(logoSource).toContain('href="/"');
    expect(logoSource).toContain('aria-label="Scholaroscope home"');
    expect(logoSource).toContain('next/image');
    expect(logoSource).not.toContain('router.back');
    expect(logoSource).not.toContain('useRouter');
    expect(headerSource).toContain('<ScholaroscopeHomeLogo variant="header"');
    expect(loginSource).toContain('<ScholaroscopeHomeLogo variant="auth"');
    expect(registerSource).toContain('<ScholaroscopeHomeLogo variant="auth"');
  });
});
