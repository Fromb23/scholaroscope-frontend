import { describe, expect, it } from 'vitest';

import {
  formatDocumentTitle,
  registerPageIdentityRoute,
  resolvePageIdentity,
} from './pageIdentity';

describe('semantic page identity titles', () => {
  it('uses the root fallback title without a URL-derived segment', () => {
    expect(resolvePageIdentity('/').displayLabel).toBe('Scholaroscope');
    expect(formatDocumentTitle(resolvePageIdentity('/').displayLabel)).toBe('Scholaroscope');
  });

  it('resolves representative static route titles', () => {
    expect(formatDocumentTitle(resolvePageIdentity('/dashboard/instructor').displayLabel)).toBe(
      'Teaching Today | Scholaroscope',
    );
    expect(formatDocumentTitle(resolvePageIdentity('/assignments').displayLabel)).toBe(
      'Assignments | Scholaroscope',
    );
    expect(formatDocumentTitle(resolvePageIdentity('/assessments').displayLabel)).toBe(
      'Assessments | Scholaroscope',
    );
    expect(formatDocumentTitle(resolvePageIdentity('/academic/cohorts').displayLabel)).toBe(
      'Classes | Scholaroscope',
    );
  });

  it('uses semantic dynamic fallbacks instead of ids, uuids, or raw urls', () => {
    const assessment = formatDocumentTitle(resolvePageIdentity('/assessments/550e8400-e29b-41d4-a716-446655440000').displayLabel);
    const assignment = formatDocumentTitle(resolvePageIdentity('/academic/cohorts/12/assignments/99').displayLabel);

    expect(assessment).toBe('Assessment | Scholaroscope');
    expect(assessment).not.toContain('550e8400');
    expect(assignment).toBe('Assignment | Scholaroscope');
    expect(assignment).not.toContain('/academic/cohorts/12/assignments/99');
  });

  it('formats loaded, loading, forbidden, and not-found labels exactly once', () => {
    expect(formatDocumentTitle('Fractions CAT')).toBe('Fractions CAT | Scholaroscope');
    expect(formatDocumentTitle('Assessment')).toBe('Assessment | Scholaroscope');
    expect(formatDocumentTitle('Access denied')).toBe('Access denied | Scholaroscope');
    expect(formatDocumentTitle('Assessment not found')).toBe('Assessment not found | Scholaroscope');
    expect(formatDocumentTitle('Fractions CAT | Scholaroscope')).toBe('Fractions CAT | Scholaroscope');
  });

  it('allows plugin routes to contribute semantic titles', () => {
    registerPageIdentityRoute({
      pattern: /^\/sample-plugin(?:\/|$)/,
      descriptor: {
        pageKind: 'sample_plugin.home',
        displayLabel: 'Sample Plugin',
        parentSection: 'Plugins',
      },
    });

    expect(formatDocumentTitle(resolvePageIdentity('/sample-plugin/tools').displayLabel)).toBe(
      'Sample Plugin | Scholaroscope',
    );
  });
});
