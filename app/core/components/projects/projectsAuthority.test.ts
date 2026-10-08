import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveAppError } from '@/app/core/errors';
import { projectKeys } from '@/app/core/lib/queryKeys';
import type { ProjectAuthority } from '@/app/core/types/projects';
import { canShowProjectEvaluationControls, getProjectLifecycleActions } from './projectAuthority';

function authority(overrides: Partial<ProjectAuthority> = {}): ProjectAuthority {
  return {
    can_view: true,
    can_supervise: false,
    can_manage: false,
    can_publish: false,
    can_administer: false,
    can_record_evidence: false,
    can_evaluate: false,
    can_finalize: false,
    can_cancel: false,
    can_export: false,
    allowed_actions: ['view'],
    ...overrides,
  };
}

describe('Projects authority rendering', () => {
  it('uses the same project workspace for teaching and supervision decisions', () => {
    const source = readFileSync('app/core/components/projects/ProjectDetailPage.tsx', 'utf8');
    expect(source).not.toMatch(
      /activeRole|active_role|role\.slug|role_slug|\bADMIN\b|\bINSTRUCTOR\b/,
    );
    expect(source).toContain('project.authority.can_supervise');
  });

  it('never displays evaluation controls without server can_evaluate', () => {
    expect(canShowProjectEvaluationControls(authority())).toBe(false);
    expect(canShowProjectEvaluationControls(authority({ can_evaluate: true }))).toBe(true);
  });

  it('keeps a supervisor read-only when mutation flags are absent', () => {
    expect(
      getProjectLifecycleActions({
        status: 'ACTIVE',
        authority: authority({ can_supervise: true }),
      }),
    ).toEqual([]);
  });

  it('derives lifecycle buttons only from server authority plus matching state', () => {
    expect(
      getProjectLifecycleActions({
        status: 'COMPLETED',
        authority: authority({ can_finalize: true, can_cancel: true }),
      }),
    ).toEqual(['finalize', 'cancel']);
  });

  it('handles API 403 as a safe permission error', () => {
    const error = resolveAppError(
      {
        response: {
          status: 403,
          data: { error: { code: 'permission_denied', message: 'Denied' } },
        },
      },
      { domain: 'projects', action: 'update' },
    );
    expect(error.kind).toBe('permission');
    expect(error.rawStatus).toBe(403);
  });

  it('keys project server state by workspace', () => {
    expect(projectKeys.deployments(1, {})).not.toEqual(projectKeys.deployments(2, {}));
  });

  it('uses the established responsive action sheet and refreshes after mutation conflicts', () => {
    const detail = readFileSync('app/core/components/projects/ProjectDetailPage.tsx', 'utf8');
    const hooks = readFileSync('app/core/hooks/useProjects.ts', 'utf8');
    expect(detail).toContain('ResponsiveActionSheet');
    expect(hooks).toContain('onSettled');
    expect(hooks).toContain('invalidateQueries');
  });

  it('does not widen server-filtered deployment collections in the API layer', () => {
    const api = readFileSync('app/core/api/projects.ts', 'utf8');
    expect(api).toContain("'/project-deployments/'");
    expect(api).not.toMatch(/organization.*projects|allProjects|filterUnauthorized/i);
  });
});
