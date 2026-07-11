import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(process.cwd(), 'app/core/components/workspace-access/WorkspaceRolesPage.tsx'),
  'utf8',
);
const assignmentPanelSource = readFileSync(
  join(process.cwd(), 'app/core/components/workspace-access/RoleAssignmentPanel.tsx'),
  'utf8',
);
const apiSource = readFileSync(
  join(process.cwd(), 'app/core/api/workspaceAccess.ts'),
  'utf8',
);
const hookSource = readFileSync(
  join(process.cwd(), 'app/core/hooks/useWorkspaceAccess.ts'),
  'utf8',
);
const typesSource = readFileSync(
  join(process.cwd(), 'app/core/types/workspaceAccess.ts'),
  'utf8',
);
const errorCopySource = readFileSync(
  join(process.cwd(), 'app/core/errors/errorCodeCopy.ts'),
  'utf8',
);
const productSource = readFileSync(
  join(process.cwd(), 'app/core/lib/productCapabilities.ts'),
  'utf8',
);

describe('workspace access frontend contract', () => {
  it('reads permission definitions and role state from backend APIs', () => {
    expect(apiSource).toContain('/workspace-access/permissions/');
    expect(apiSource).toContain('/workspace-access/templates/');
    expect(apiSource).toContain('/workspace-access/roles/');
    expect(apiSource).toContain('/workspace-access/assignments/');
    expect(apiSource).toContain('/workspace-access/assignment-options/');
    expect(apiSource).toContain('/workspace-access/me/');
    expect(apiSource).toContain('getAssignmentOptions');
    expect(typesSource).toContain('WorkspaceRoleAssignmentOptionsResponse');
    expect(typesSource).toContain('staff_options: WorkspaceStaffOption[]');
    expect(typesSource).toContain('scope_options: WorkspaceScopeOption[]');
    expect(typesSource).toContain('is_teaching_actor: boolean');
    expect(pageSource).toContain('PermissionMatrix');
    expect(pageSource).toContain('AdminSlotSummary');
    expect(pageSource).toContain('RoleAssignmentPanel');
  });

  it('keeps product capabilities separate from actor permissions', () => {
    expect(productSource).toContain('hasWorkspacePermission');
    expect(productSource).toContain('hasFeatureAccess');
    expect(productSource).toContain('hasProductCapability');
  });

  it('uses staff terminology for role assignments', () => {
    expect(pageSource).toContain('Roles &amp; permissions');
    expect(assignmentPanelSource).toContain('Staff role assignments');
    expect(assignmentPanelSource).toContain('Staff member');
    expect(assignmentPanelSource).toContain('No active staff role assignments returned.');
    expect(assignmentPanelSource).not.toContain('Membership ID');
  });

  it('loads assignment options only from backend assignment authority state', () => {
    expect(hookSource).toContain('assignmentOptions');
    expect(hookSource).toContain('workspaceAccessAPI.getAssignmentOptions');
    expect(hookSource).toContain('workspace.roles.assign');
    expect(hookSource).toContain('rolesQuery.isSuccess');
    expect(hookSource).toContain('meQuery.isSuccess');
    expect(hookSource).toContain('enabled: canLoadAssignmentOptions');
    expect(hookSource).toContain('assignmentOptionsError');
    expect(hookSource).toContain('resolveAppError');
  });

  it('passes real staff and scope options into the assignment panel', () => {
    expect(pageSource).toContain('assignmentOptionsQuery.data?.staff_options');
    expect(pageSource).toContain('assignmentOptionsQuery.data?.scope_options');
    expect(pageSource).toContain('assignmentOptionsError');
    expect(pageSource).toContain('<AppErrorBanner');
  });

  it('uses staff options instead of assignment-derived membership discovery', () => {
    expect(assignmentPanelSource).toContain('staffOptions = []');
    expect(assignmentPanelSource).toContain('staff.map');
    expect(assignmentPanelSource).toContain('option.membership_id');
    expect(assignmentPanelSource).toContain('option.label} · {option.email');
    expect(assignmentPanelSource).not.toContain('staffOptionsFromAssignments');
  });

  it('does not hardcode workspace scope for new role assignments', () => {
    expect(assignmentPanelSource).not.toContain("scope_type: 'WORKSPACE'");
    expect(assignmentPanelSource).not.toContain('scope_type: "WORKSPACE"');
    expect(assignmentPanelSource).toContain('scopeType');
    expect(assignmentPanelSource).toContain('scope_object_id');
    expect(assignmentPanelSource).toContain('broad_scope_confirmed');
  });

  it('filters scope controls through backend assignment scope policy', () => {
    expect(assignmentPanelSource).toContain('selectedRole?.assignment_scope_policy');
    expect(assignmentPanelSource).toContain('allowed_scope_types');
    expect(assignmentPanelSource).toContain('SCOPE_TYPES.filter');
    expect(assignmentPanelSource).toContain("{ value: 'COHORT', label: 'Cohort' }");
    expect(assignmentPanelSource).toContain("{ value: 'SUBJECT', label: 'Subject' }");
    expect(assignmentPanelSource).toContain("{ value: 'COHORT_SUBJECT', label: 'Class subject' }");
    expect(assignmentPanelSource).toContain('disabled={!selectedRole || availableScopeTypes.length === 0}');
    expect(assignmentPanelSource).toContain('scopeOptions.filter((option) => option.scope_type === scopeType)');
    expect(assignmentPanelSource).toContain('Workspace has no object');
    expect(assignmentPanelSource).toContain('option.description ? `${option.label} - ${option.description}` : option.label');
  });

  it('requires explicit scope and policy-driven confirmation for broad workspace assignment rendering', () => {
    expect(assignmentPanelSource).toContain('Select scope');
    expect(assignmentPanelSource).toContain('Workspace scope applies this role across the entire workspace.');
    expect(assignmentPanelSource).toContain('workspaceScopeRequiresConfirmation');
    expect(assignmentPanelSource).toContain('workspace_scope_requires_confirmation');
    expect(assignmentPanelSource).toContain('broad_scope_confirmed: workspaceScopeRequiresConfirmation ? workspaceScopeConfirmed : false');
    expect(assignmentPanelSource).toContain('Reason');
  });

  it('submits selected scope object IDs in the backend payload shape', () => {
    expect(assignmentPanelSource).toContain('const parsedScopeObjectId = scopeType === \'WORKSPACE\' ? null : Number(scopeObjectId);');
    expect(assignmentPanelSource).toContain('membership_id: parsedMembershipId');
    expect(assignmentPanelSource).toContain('role_id: parsedRoleId');
    expect(assignmentPanelSource).toContain('assigned_reason: reason.trim()');
    expect(assignmentPanelSource).toContain('scope_type: scopeType');
    expect(assignmentPanelSource).toContain('scope_object_id: parsedScopeObjectId');
  });

  it('renders backend assignment scope errors through structured app errors', () => {
    expect(pageSource).toContain('setAssignmentError(resolveAppError(error');
    expect(pageSource).toContain('entityLabel: \'staff role assignment\'');
    expect(errorCopySource).toContain('workspace_role_scope_required');
    expect(errorCopySource).toContain('workspace_role_scope_too_broad');
    expect(errorCopySource).toContain('broad_workspace_scope_requires_confirmation');
    expect(errorCopySource).toContain('assignment_scope_invalid');
    expect(errorCopySource).toContain('permission_denied');
    expect(errorCopySource).toContain('workspace_governance_not_applicable');
  });

  it('uses backend-compatible end-assignment payload naming', () => {
    expect(apiSource).toContain('{\n      reason,\n    }');
    expect(apiSource).not.toContain('ended_reason: reason');
  });
});
