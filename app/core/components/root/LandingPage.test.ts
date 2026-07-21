import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceFor = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('LandingPage public composition', () => {
  it('renders only the simple public landing composition', () => {
    const landingSource = sourceFor('app/core/components/root/LandingPage.tsx');

    expect(landingSource).toContain('<PublicHeader');
    expect(landingSource).toContain('<HeroSection');
    expect(landingSource).toContain('<FaqSection');
    expect(landingSource).toContain('<PublicFooter');

    for (const removedSection of [
      '<ProblemSection',
      '<HowItWorksSection',
      '<EvidenceDashboardSection',
      '<ReportAudienceSection',
      '<AudienceSection',
      '<EvidenceIntegritySection',
      '<CommercialSection',
      '<FooterCtaSection',
    ]) {
      expect(landingSource).not.toContain(removedSection);
    }
  });

  it('does not expose forbidden public marketing labels in the landing source', () => {
    const publicLandingSource = [
      sourceFor('app/core/components/root/LandingPage.tsx'),
      sourceFor('app/core/components/public/HeroSection.tsx'),
      sourceFor('app/core/components/public/FaqSection.tsx'),
      sourceFor('app/core/components/public/PublicHeader.tsx'),
      sourceFor('app/core/components/public/PublicFooter.tsx'),
    ].join('\n');

    expect(publicLandingSource).not.toContain('The problem');
    expect(publicLandingSource).not.toContain('How it works');
    expect(publicLandingSource).not.toContain('The missing infrastructure for CBC');
  });

  it('uses valid public header destinations for the rendered landing sections', () => {
    const publicHeaderSource = sourceFor('app/core/components/public/PublicHeader.tsx');

    expect(publicHeaderSource).toContain("href: '#faq'");
    expect(publicHeaderSource).toContain('href="/login"');
    expect(publicHeaderSource).toContain('href="/get-started"');
    expect(publicHeaderSource).not.toContain('#how-it-works');
    expect(publicHeaderSource).not.toContain('#features');
    expect(publicHeaderSource).not.toContain('#audiences');
  });
});
