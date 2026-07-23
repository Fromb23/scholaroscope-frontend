import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pageSource = readFileSync(join(root, 'app/core/components/portfolio/LearnerPortfolioPage.tsx'), 'utf8');
const cardSource = readFileSync(join(root, 'app/core/components/portfolio/PortfolioEvidenceCard.tsx'), 'utf8');
const detailSource = readFileSync(join(root, 'app/core/components/portfolio/PortfolioEvidenceDetail.tsx'), 'utf8');
const filtersSource = readFileSync(join(root, 'app/core/components/portfolio/PortfolioFilters.tsx'), 'utf8');
const routeSource = readFileSync(join(root, 'app/(dashboard)/learners/[learnerId]/portfolio/page.tsx'), 'utf8');

describe('Learner Portfolio route and UI contract', () => {
  it('exposes a dedicated learner-scoped route', () => {
    expect(routeSource).toContain('LearnerPortfolioPage');
    expect(pageSource).toContain('/learners/${learnerId}/portfolio');
    expect(pageSource).toContain('Learner Portfolio');
  });

  it('keeps filter state and selected evidence in the URL', () => {
    expect(pageSource).toContain("searchParams.get('academic_year')");
    expect(pageSource).toContain("searchParams.get('term')");
    expect(pageSource).toContain("searchParams.get('cohort_subject')");
    expect(pageSource).toContain("searchParams.get('outcome')");
    expect(pageSource).toContain("searchParams.get('source')");
    expect(pageSource).toContain("params.set('evidence'");
    expect(pageSource).toContain("params.set('returnTo'");
  });

  it('renders mobile-friendly cards and detail instead of a compressed table', () => {
    expect(cardSource).toContain('PortfolioEvidenceCard');
    expect(detailSource).toContain('PortfolioEvidenceDetail');
    expect(pageSource).not.toContain('<table');
    expect(cardSource).not.toContain('<table');
  });

  it('handles access failure, empty states, missing artifacts, and invalid evidence detail', () => {
    expect(pageSource).toContain('No learner portfolio access');
    expect(pageSource).toContain('No visible learner evidence has been recorded');
    expect(pageSource).toContain('No visible evidence matches the active portfolio filters');
    expect(detailSource).toContain('missing or inaccessible');
    expect(detailSource).toContain('No access to this evidence');
  });

  it('supports the required filter controls', () => {
    expect(filtersSource).toContain('Academic year');
    expect(filtersSource).toContain('Term');
    expect(filtersSource).toContain('Learning area');
    expect(filtersSource).toContain('Outcome');
    expect(filtersSource).toContain('Evidence source');
  });
});
