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
    expect(formatDocumentTitle(resolvePageIdentity('/admin/instructors').displayLabel)).toBe(
      'Staff | Scholaroscope',
    );
    expect(formatDocumentTitle(resolvePageIdentity('/learners').displayLabel)).toBe(
      'Learners | Scholaroscope',
    );
    expect(formatDocumentTitle(resolvePageIdentity('/projects').displayLabel)).toBe(
      'Projects | Scholaroscope',
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

  it('uses safe fallbacks for reset, project-stream, and cohort-assignment routes', () => {
    const reset = formatDocumentTitle(
      resolvePageIdentity('/reset-password/private-uid/secret-token').displayLabel,
    );
    const projectStreams = formatDocumentTitle(
      resolvePageIdentity('/projects/definitions/8472').displayLabel,
    );
    const assignments = formatDocumentTitle(
      resolvePageIdentity('/academic/cohorts/42/assignments').displayLabel,
    );

    expect(reset).toBe('Reset Password | Scholaroscope');
    expect(reset).not.toContain('private-uid');
    expect(reset).not.toContain('secret-token');
    expect(projectStreams).toBe('Project Streams | Scholaroscope');
    expect(projectStreams).not.toContain('8472');
    expect(assignments).toBe('Assignments | Scholaroscope');
    expect(assignments).not.toContain('42');
  });

  it('uses a stable staff-teaching fallback for instructor progress routes', () => {
    const label = resolvePageIdentity('/admin/instructors/42/progress').displayLabel;
    expect(label).toBe('Staff Teaching');
    expect(formatDocumentTitle(label)).toBe('Staff Teaching | Scholaroscope');
    // Route identity deliberately receives a pathname, so a return target
    // query string cannot leak into the browser title.
    expect(resolvePageIdentity('/admin/instructors/42/progress').displayLabel).toBe(label);
  });

  it('identifies only numeric project workspaces with the project fallback', () => {
    expect(formatDocumentTitle(resolvePageIdentity('/projects/42').displayLabel)).toBe(
      'Project | Scholaroscope',
    );
    expect(resolvePageIdentity('/projects/new').pageKind).toBe('unknown');
    expect(resolvePageIdentity('/projects/catalogue').pageKind).toBe('unknown');
    expect(resolvePageIdentity('/projects/definitions/42').pageKind).toBe('projects.streams');
  });

  it('formats loaded, loading, forbidden, and not-found labels exactly once', () => {
    expect(formatDocumentTitle('Fractions CAT')).toBe('Fractions CAT | Scholaroscope');
    expect(formatDocumentTitle('Assessment')).toBe('Assessment | Scholaroscope');
    expect(formatDocumentTitle('Access denied')).toBe('Access denied | Scholaroscope');
    expect(formatDocumentTitle('Assessment not found')).toBe('Assessment not found | Scholaroscope');
    expect(formatDocumentTitle('Fractions CAT | Scholaroscope')).toBe('Fractions CAT | Scholaroscope');
    expect(formatDocumentTitle('Projects | Scholaroscope')).toBe('Projects | Scholaroscope');
    expect(formatDocumentTitle('Staff - Mr Rombo Teaching')).toBe(
      'Staff - Mr Rombo Teaching | Scholaroscope',
    );
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
