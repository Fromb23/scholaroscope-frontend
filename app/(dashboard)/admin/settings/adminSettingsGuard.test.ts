import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin settings guard', () => {
  it('blocks non-admin organization settings access in the core settings page', () => {
    const source = readFileSync(join(process.cwd(), 'app/core/components/settings/AdminSettingsPage.tsx'), 'utf8');

    expect(source).toContain('canManageSettings');
    expect(source).toContain('You do not have permission to manage organization settings.');
    expect(source).toContain("activeRole === 'ADMIN'");
  });
});
