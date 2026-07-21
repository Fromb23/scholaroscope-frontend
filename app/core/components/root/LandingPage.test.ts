import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceFor = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('LandingPage public composition', () => {
  it('renders the product-focused public landing composition', () => {
    const landingSource = sourceFor('app/core/components/root/LandingPage.tsx');

    expect(landingSource).toContain('<PublicHeader');
    expect(landingSource).toContain('<HeroSection');
    expect(landingSource).toContain('<ProblemSection');
    expect(landingSource).toContain('<WorkflowSection');
    expect(landingSource).toContain('<ProductPreviewSection');
    expect(landingSource).toContain('<AudienceSection');
    expect(landingSource).toContain('<TrustSection');
    expect(landingSource).toContain('<FaqSection');
    expect(landingSource).toContain('<FinalCtaSection');
    expect(landingSource).toContain('<PublicFooter');
  });

  it('uses truthful product positioning and bounded screenshots', () => {
    const publicLandingSource = [
      sourceFor('app/core/components/root/LandingPage.tsx'),
      sourceFor('app/core/components/public/HeroSection.tsx'),
      sourceFor('app/core/components/public/ProductPreviewSection.tsx'),
      sourceFor('app/core/components/public/TrustSection.tsx'),
      sourceFor('app/core/components/public/FaqSection.tsx'),
      sourceFor('app/core/components/public/PublicHeader.tsx'),
      sourceFor('app/core/components/public/PublicFooter.tsx'),
    ].join('\n');

    expect(publicLandingSource).toContain('Stop reconstructing learner progress from memory.');
    expect(publicLandingSource).toContain('Built from real classroom workflow in Kenya.');
    expect(publicLandingSource).toContain('instructor-reports-overview.webp');
    expect(publicLandingSource).toContain('instructor-teaching-load.webp');
    expect(publicLandingSource).toContain('assessments-and-grading.webp');
    expect(publicLandingSource).toContain('width={1199}');
    expect(publicLandingSource).toContain('height={595}');
    expect(publicLandingSource).not.toContain('customer');
    expect(publicLandingSource).not.toContain('testimonial');
    expect(publicLandingSource).not.toContain('government partnership');
  });

  it('uses valid public header destinations for the rendered landing sections', () => {
    const publicHeaderSource = sourceFor('app/core/components/public/PublicHeader.tsx');

    expect(publicHeaderSource).toContain("href: '#faq'");
    expect(publicHeaderSource).toContain("href: '#product'");
    expect(publicHeaderSource).toContain("href: '#how-it-works'");
    expect(publicHeaderSource).toContain("href: '#for-teachers'");
    expect(publicHeaderSource).toContain("href: '#for-schools'");
    expect(publicHeaderSource).toContain('href="/login"');
    expect(publicHeaderSource).toContain('href="/get-started"');
    expect(publicHeaderSource).not.toContain('#features');
    expect(publicHeaderSource).not.toContain('#audiences');
  });
});
