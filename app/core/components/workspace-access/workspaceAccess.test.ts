import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(process.cwd(), 'app/core/components/workspace-access/WorkspaceRolesPage.tsx'),
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
    expect(apiSource).toContain('/workspace-access/me/');
    expect(pageSource).toContain('PermissionMatrix');
    expect(pageSource).toContain('AdminSlotSummary');
  });

  it('keeps product capabilities separate from actor permissions', () => {
    expect(productSource).toContain('hasWorkspacePermission');
    expect(productSource).toContain('hasFeatureAccess');
    expect(productSource).toContain('hasProductCapability');
  });
});
