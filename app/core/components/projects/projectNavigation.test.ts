import { describe, expect, it } from 'vitest';
import {
  buildProjectDetailHref,
  buildProjectWorkspaceHref,
  projectBackHref,
} from './projectNavigation';

describe('project workspace navigation', () => {
  it('preserves filtered project-list origins', () => {
    const href = buildProjectDetailHref(42, '/projects?status=ACTIVE&search=robot');
    expect(href).toContain('/projects/42?');
    expect(new URL(href, 'http://localhost').searchParams.get('returnTo')).toBe(
      '/projects?status=ACTIVE&search=robot',
    );
  });

  it('preserves safe workspace state across tabs', () => {
    const href = buildProjectWorkspaceHref(
      42,
      'tab=evaluations&task=7&participant=9&returnTo=%2Freports%2Flearners%2F3%2Fportfolio%3Fsource%3DPROJECT',
      'observations',
    );
    const parsed = new URL(href, 'http://localhost');
    expect(parsed.searchParams.get('tab')).toBe('observations');
    expect(parsed.searchParams.get('task')).toBe('7');
    expect(parsed.searchParams.get('participant')).toBe('9');
    expect(parsed.searchParams.get('returnTo')).toBe(
      '/reports/learners/3/portfolio?source=PROJECT',
    );
  });

  it('rejects external, protocol-relative, malformed and recursive origins', () => {
    expect(projectBackHref('https://evil.example')).toBe('/projects');
    expect(projectBackHref('//evil.example/path')).toBe('/projects');
    expect(projectBackHref('/%E0%A4%A')).toBe('/projects');
    expect(projectBackHref('/projects?returnTo=%2Fa%3FreturnTo%3D%252Fb%253FreturnTo%253D%25252Fc')).toBe('/projects');
  });
});
