import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin settings guard', () => {
  it('uses action permissions instead of an administrator role label', () => {
    const source = readFileSync(join(process.cwd(), 'app/core/components/settings/AdminSettingsPage.tsx'), 'utf8');

    expect(source).toContain('canManageSettings');
    expect(source).toContain('You do not have permission to manage organization settings.');
    expect(source).toContain('getWorkspaceSettingsTabs(capabilities, { isFreelance })');
    expect(source).not.toContain("activeRole === 'ADMIN'");
  });
});
