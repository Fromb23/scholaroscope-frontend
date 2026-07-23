import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pageSource = readFileSync(join(root, 'app/core/components/portfolio/LearnerPortfolioPage.tsx'), 'utf8');
const cardSource = readFileSync(join(root, 'app/core/components/portfolio/PortfolioEvidenceCard.tsx'), 'utf8');
const detailSource = readFileSync(join(root, 'app/core/components/portfolio/PortfolioEvidenceDetail.tsx'), 'utf8');
const filtersSource = readFileSync(join(root, 'app/core/components/portfolio/PortfolioFilters.tsx'), 'utf8');
const canonicalPortfolioRoute = join(root, 'app/(dashboard)/learners/[id]/portfolio/page.tsx');
const conflictingPortfolioRoute = join(root, 'app/(dashboard)/learners/[learnerId]/portfolio/page.tsx');
const routeSource = readFileSync(canonicalPortfolioRoute, 'utf8');

const learnerReportRoutes = [
  'app/(dashboard)/reports/learners/[learnerId]/overview/page.tsx',
  'app/(dashboard)/reports/learners/[learnerId]/subject/page.tsx',
  'app/(dashboard)/reports/learners/[learnerId]/assessments/page.tsx',
  'app/(dashboard)/reports/learners/[learnerId]/assignments/page.tsx',
];

function dynamicSegmentName(segment: string): string | null {
  const match = segment.match(/^\[([^\]]+)\]$/);
  if (!match || match[1].startsWith('...')) return null;
  return match[1];
}

function routeSegmentKey(segment: string): string | null {
  if (segment.startsWith('(') && segment.endsWith(')')) return null;
  if (segment.startsWith('@') || segment.startsWith('_')) return null;
  return dynamicSegmentName(segment) ? '[]' : segment;
}

function hasRouteFileDescendant(directory: string): boolean {
  return readdirSync(directory, { withFileTypes: true }).some((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isFile()) {
      return /^(page|route)\.(?:js|jsx|ts|tsx)$/.test(entry.name);
    }
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) {
      return false;
    }
    return hasRouteFileDescendant(fullPath);
  });
}

function findDynamicSlugConflicts(directory: string, routeSegments: string[] = []): string[] {
  const childDirectories = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_'))
    .map((entry) => ({ name: entry.name, path: join(directory, entry.name) }))
    .filter((entry) => statSync(entry.path).isDirectory() && hasRouteFileDescendant(entry.path));

  const slugNamesByPosition = new Map<string, Set<string>>();
  for (const child of childDirectories) {
    const slugName = dynamicSegmentName(child.name);
    if (!slugName) continue;
    const position = routeSegments.join('/') || '/';
    const slugNames = slugNamesByPosition.get(position) ?? new Set<string>();
    slugNames.add(slugName);
    slugNamesByPosition.set(position, slugNames);
  }

  const conflicts = Array.from(slugNamesByPosition.entries())
    .filter(([, names]) => names.size > 1)
    .map(([position, names]) => `${position}: ${Array.from(names).sort().join(', ')}`);

  for (const child of childDirectories) {
    const key = routeSegmentKey(child.name);
    conflicts.push(...findDynamicSlugConflicts(child.path, key ? [...routeSegments, key] : routeSegments));
  }

  return conflicts;
}

describe('Learner Portfolio route and UI contract', () => {
  it('resolves through the canonical learner branch', () => {
    expect(existsSync(canonicalPortfolioRoute)).toBe(true);
    expect(existsSync(conflictingPortfolioRoute)).toBe(false);
    expect(routeSource).toContain('LearnerPortfolioPage');
    expect(pageSource).toContain('useParams<{ id: string }>()');
    expect(pageSource).toContain('Number(params.id)');
    expect(pageSource).not.toContain('params.learnerId');
  });

  it('keeps direct portfolio navigation on the stable public URL', () => {
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

  it('preserves existing learner report route wrappers', () => {
    for (const route of learnerReportRoutes) {
      expect(existsSync(join(root, route))).toBe(true);
    }
  });

  it('does not contain competing dynamic slugs at the same route-tree position', () => {
    expect(findDynamicSlugConflicts(join(root, 'app'))).toEqual([]);
  });
});
