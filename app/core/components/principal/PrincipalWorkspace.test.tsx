import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PrincipalWorkspaceShell } from './PrincipalWorkspace';

describe('Principal workspace foundation', () => {
  it('renders an honest accessible empty state without fabricated answers', () => {
    const html = renderToStaticMarkup(
      <PrincipalWorkspaceShell
        workspaceName="Scholaroscope Academy"
        academicYearName="2026"
        termName="Term 3"
      />,
    );

    expect(html).toContain('Scholaroscope Academy');
    expect(html).toContain('Governed service not connected');
    expect(html).toContain('No answer sources to display');
    expect(html).toContain('aria-label="Principal school question"');
  });

  it('renders accessible loading and error states', () => {
    const loading = renderToStaticMarkup(
      <PrincipalWorkspaceShell workspaceName="School" state="loading" />,
    );
    const error = renderToStaticMarkup(
      <PrincipalWorkspaceShell
        workspaceName="School"
        state="error"
        errorMessage="Academic context failed"
      />,
    );

    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('The prompt shell remains available');
    expect(loading).toContain('aria-label="Principal school question"');
    expect(error).toContain('role="alert"');
    expect(error).toContain('Academic context failed');
    expect(error).toContain('aria-label="Principal school question"');
  });

  it('does not use activeRole in production Principal guards', () => {
    const guardedFiles = [
      'app/utils/routeAccess.ts',
      'app/components/layout/navConfig.ts',
      'app/context/AuthContext.tsx',
      'app/(dashboard)/DashboardClientShell.tsx',
      'app/core/components/principal/PrincipalWorkspace.tsx',
    ];
    const source = guardedFiles
      .map((path) => readFileSync(join(process.cwd(), path), 'utf8'))
      .join('\n');

    expect(source).not.toMatch(
      /activeRole[^\n]*INSTITUTION_OVERSIGHT|INSTITUTION_OVERSIGHT[^\n]*activeRole/,
    );
    expect(readFileSync(join(process.cwd(), 'app/components/layout/Header.tsx'), 'utf8'))
      .toContain("activeOperatingContext !== 'INSTITUTION_OVERSIGHT'");
  });
});
