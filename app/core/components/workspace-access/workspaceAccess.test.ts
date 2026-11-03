import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const page = read('app/core/components/workspace-access/WorkspaceRolesPage.tsx');
const panel = read('app/core/components/workspace-access/RoleAssignmentPanel.tsx');
const api = read('app/core/api/workspaceAccess.ts');
const hook = read('app/core/hooks/useWorkspaceAccess.ts');
const types = read('app/core/types/workspaceAccess.ts');

describe('workspace roles redesign', () => {
  it('defaults to the role catalogue and exposes summary counts', () => {
    expect(page).toContain("useState<Tab>('roles')");
    expect(page).toContain("['Total roles', summary?.total_roles]");
    expect(page).toContain("['Active role assignments', summary?.active_role_assignments]");
    expect(api).toContain('/workspace-access/roles/catalogue/');
  });

  it('distinguishes protected system roles from mutable custom roles', () => {
    expect(page).toContain("role.is_system_managed ? 'System' : 'Custom'");
    expect(page).toContain('role.actions.can_update');
    expect(page).toContain('role.actions.can_archive');
    expect(page).toContain('role.action_explanations.update');
    expect(types).toContain('action_explanations');
  });

  it('keeps Principal visible but outside generic mutation flows', () => {
    expect(page).toContain("role.responsibility_type === 'OVERSIGHT'");
    expect(page).toContain('Principal oversight is managed through the institution-governance lifecycle.');
    expect(page).toContain('Appointment, replacement, suspension, restoration and tenure ending are not available here.');
  });

  it('renders each projected staff member once with role chips', () => {
    expect(api).toContain('/workspace-access/staff-assignments/');
    expect(panel).toContain('staff.map((person)');
    expect(panel).toContain('person.roles.map');
    expect(panel).not.toContain('membership_classification}');
    expect(panel).toContain('Active staff');
  });

  it('does not require a reason for routine assignment or removal', () => {
    expect(panel).not.toContain('assigned_reason:');
    expect(panel).not.toContain('End reason');
    expect(panel).toContain('onEnd(item.assignment_id)');
    expect(api).toContain('reason?: string');
  });

  it('reveals scope fields only after selecting a role', () => {
    expect(panel).toContain('role && !defaultWorkspace');
    expect(panel).toContain("effectiveScope !== 'WORKSPACE'");
    expect(panel).toContain("defaultWorkspace ? 'WORKSPACE' : scopeType");
    expect(panel).toContain('broad_scope_confirmed');
  });

  it('uses organization-scoped cache keys and refreshes projections after mutations', () => {
    expect(hook).toContain("['workspace-access', organizationId");
    expect(hook).toContain('staffAssignments(organizationId)');
    expect(hook).toContain('invalidateQueries');
  });

  it('provides loading, empty, error and retry states', () => {
    expect(page).toContain('Loading workspace roles and staff assignments');
    expect(page).toContain('No roles found');
    expect(page).toContain('Retry');
    expect(panel).toContain('No staff members are available');
  });
});
