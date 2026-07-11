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
    expect(apiSource).toContain('/workspace-access/me/');
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

  it('does not hardcode workspace scope for new role assignments', () => {
    expect(assignmentPanelSource).not.toContain("scope_type: 'WORKSPACE'");
    expect(assignmentPanelSource).not.toContain('scope_type: "WORKSPACE"');
    expect(assignmentPanelSource).toContain('scopeType');
    expect(assignmentPanelSource).toContain('scope_object_id');
    expect(assignmentPanelSource).toContain('broad_scope_confirmed');
  });

  it('requires explicit scope and confirmation for broad workspace assignment rendering', () => {
    expect(assignmentPanelSource).toContain('Select scope');
    expect(assignmentPanelSource).toContain('Workspace scope applies this role across the entire workspace.');
    expect(assignmentPanelSource).toContain('workspaceScopeConfirmed');
    expect(assignmentPanelSource).toContain('Reason');
  });
});
