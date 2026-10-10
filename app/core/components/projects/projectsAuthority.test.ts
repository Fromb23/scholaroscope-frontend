import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveAppError } from '@/app/core/errors';
import { projectKeys } from '@/app/core/lib/queryKeys';
import type { ProjectAuthority } from '@/app/core/types/projects';
import { getProjectLifecycleActions } from './projectAuthority';

function authority(overrides: Partial<ProjectAuthority> = {}): ProjectAuthority {
  return {
    can_view: true,
    can_supervise: false,
    can_manage: false,
    can_publish: false,
    can_start: false,
    can_complete: false,
    can_administer: false,
    can_manage_groups: false,
    can_record_evidence: false,
    can_evaluate: false,
    can_finalize: false,
    can_update_checklist: false,
    can_cancel: false,
    can_export: false,
    can_reconcile_streams: false,
    can_reopen_for_late_evidence: false,
    allowed_actions: ['view'],
    blocked_reason_codes: {},
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

  it('keeps a supervisor read-only when mutation flags are absent', () => {
    expect(
      getProjectLifecycleActions({
        status: 'ACTIVE',
        authority: authority({ can_supervise: true }),
      }),
    ).toEqual([]);
  });

  it('derives lifecycle buttons only from exact server decisions', () => {
    expect(
      getProjectLifecycleActions({
        status: 'COMPLETED',
        authority: authority({ can_finalize: true, can_cancel: true }),
      }),
    ).toEqual(['finalize', 'cancel']);
  });

  it('does not reconstruct start readiness from status or broad administration authority', () => {
    expect(
      getProjectLifecycleActions({
        status: 'PUBLISHED',
        authority: authority({ can_administer: true, can_start: false }),
      }),
    ).toEqual([]);
    expect(
      getProjectLifecycleActions({
        status: 'PUBLISHED',
        authority: authority({ can_start: true }),
      }),
    ).toEqual(['start']);
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

  it('keeps participants read-only and removes public mutation endpoints', () => {
    const detail = readFileSync('app/core/components/projects/ProjectDetailPage.tsx', 'utf8');
    const api = readFileSync('app/core/api/projects.ts', 'utf8');
    expect(detail).not.toContain('Manage participants');
    expect(detail).not.toContain('withdrawParticipant');
    expect(api).not.toMatch(
      /eligible-late-participants|participants\/add-late|participants\/withdraw/,
    );
  });

  it('binds evidence recording to the task workspace', () => {
    const detail = readFileSync('app/core/components/projects/ProjectDetailPage.tsx', 'utf8');
    const recorder = readFileSync(
      'app/core/components/projects/ProjectEvidenceRecorder.tsx',
      'utf8',
    );
    expect(detail).toContain('ProjectTaskWorkspace');
    expect(detail).toContain('setEvidenceTaskId(taskInView.id)');
    expect(recorder).not.toContain('label="Task"');
    expect(recorder).toContain('Record<number, Draft>');
  });

  it('binds activation and evaluation to the task workspace', () => {
    const detail = readFileSync('app/core/components/projects/ProjectDetailPage.tsx', 'utf8');
    const api = readFileSync('app/core/api/projects.ts', 'utf8');
    const hooks = readFileSync('app/core/hooks/useProjects.ts', 'utf8');
    const forms = readFileSync('app/core/components/projects/ProjectWorkForms.tsx', 'utf8');
    expect(api).toContain('activateTask');
    expect(api).toContain('/activate-task/');
    expect(hooks).toContain("refetchType: 'active'");
    expect(detail).not.toContain('Evaluate criteria');
    expect(detail).toContain('ProjectTaskEvaluationEditor');
    expect(detail).toContain('onStartTask');
    expect(detail).toContain("next.set('task', String(taskId))");
    expect(forms).not.toContain('ProjectEvaluationForm');
    expect(forms).not.toContain('Select task');
  });
});
