import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/hooks/usePlugins.ts'),
  'utf8',
);

describe('usePlugins capability state', () => {
  it('exposes explicit states instead of overloading an empty plugin array', () => {
    const hookSource = source();

    for (const state of [
      'loading',
      'available',
      'disabled',
      'not_installed',
      'unauthorized',
      'request_failed',
      'organization_unresolved',
    ]) {
      expect(hookSource).toContain(`state: '${state}'`);
    }
    expect(hookSource).toContain('getPluginCapabilityState');
  });

  it('clears stale plugin rows before organization-scoped fetches complete', () => {
    const hookSource = source();

    expect(hookSource).toContain('const scopedOrganizationId = organizationId ?? activeOrg?.id ?? null');
    expect(hookSource).toContain('setPlugins([]);');
    expect(hookSource).toContain('pluginAPI.getInstalled(scopedOrganizationId ?? undefined)');
  });
});
