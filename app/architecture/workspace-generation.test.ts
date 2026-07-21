import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryRoots: string[] = [];

function fixture(files: Record<string, string>): { root: string; baseline: string } {
  const root = mkdtempSync(join(tmpdir(), 'workspace-generation-check-'));
  temporaryRoots.push(root);
  Object.entries(files).forEach(([relative, source]) => {
    const target = join(root, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, source);
  });
  const baseline = join(root, 'baseline.json');
  writeFileSync(baseline, '{}');
  return { root, baseline };
}

function runChecker(root: string, baseline: string): string {
  return execFileSync(
    process.execPath,
    ['tools/check-workspace-boundaries.mjs', '--root', root, '--baseline', baseline],
    { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' },
  );
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
});

describe('workspace generation architecture guard', () => {
  it('rejects critical workspace files without their local generation anchors', () => {
    const { root, baseline } = fixture({
      'context/AuthContext.tsx': 'export const auth = true;',
      'core/api/client.ts': 'export const client = true;',
      'core/hooks/useNotifications.ts': 'export const notifications = true;',
      '(dashboard)/DashboardClientShell.tsx': 'export const shell = true;',
    });

    expect(() => runChecker(root, baseline)).toThrow();
  });

  it('accepts generation-protected critical files', () => {
    const { root, baseline } = fixture({
      'context/AuthContext.tsx': 'workspaceGeneration advanceWorkspaceGeneration captureWorkspaceAuthority getAccessTokenVersion isWorkspaceAuthorityCurrent',
      'core/api/client.ts': '_workspaceGeneration getWorkspaceGeneration assertWorkspaceGeneration WorkspaceGenerationSupersededError',
      'core/hooks/useNotifications.ts': 'useWorkspaceGeneration captureWorkspaceAuthority setNotifications([]) setUnreadCount(0) previousSnapshot.current = new Map()',
      '(dashboard)/DashboardClientShell.tsx': 'WorkspaceGenerationBoundary',
    });

    expect(runChecker(root, baseline)).toContain('Workspace boundary guard passed.');
  });

  it('does not accept a helper mention in an unrelated file', () => {
    const { root, baseline } = fixture({
      'context/AuthContext.tsx': 'export const auth = true;',
      'core/runtime/unrelated.ts': 'advanceWorkspaceGeneration captureWorkspaceAuthority getAccessTokenVersion isWorkspaceAuthorityCurrent workspaceGeneration',
    });

    expect(() => runChecker(root, baseline)).toThrow();
  });
});
