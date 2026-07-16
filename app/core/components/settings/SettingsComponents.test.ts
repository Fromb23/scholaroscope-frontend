import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const settingsSource = () => readFileSync(
  join(process.cwd(), 'app/core/components/settings/SettingsComponents.tsx'),
  'utf8',
);

const adminSettingsSource = () => readFileSync(
  join(process.cwd(), 'app/core/components/settings/AdminSettingsPage.tsx'),
  'utf8',
);

const pluginTypesSource = () => readFileSync(
  join(process.cwd(), 'app/core/types/plugins.ts'),
  'utf8',
);

const usePluginsSource = () => readFileSync(
  join(process.cwd(), 'app/core/hooks/usePlugins.ts'),
  'utf8',
);

describe('workspace feature settings policy UI', () => {
  it('uses workspace-facing feature terminology instead of plugin-core grouping', () => {
    const source = settingsSource();

    expect(adminSettingsSource()).toContain("label: 'Features & integrations'");
    expect(source).toContain('Included features');
    expect(source).toContain('Premium features');
    expect(source).toContain('Integrations');
    expect(source).toContain('Metered capabilities');
    expect(source).not.toContain('Core Plugins');
    expect(source).not.toContain('Optional Plugins');
    expect(source).not.toContain('Activate or deactivate as needed');
  });

  it('drives feature state and visibility from backend policy metadata', () => {
    const source = settingsSource();
    const types = pluginTypesSource();

    expect(types).toContain('PluginManagementContract');
    expect(source).toContain('plugin.effective_enabled ??');
    expect(source).toContain("plugin.policy_classification !== 'NOT_APPLICABLE'");
    expect(source).toContain('management.action_mode');
    expect(source).toContain('management.can_toggle');
    expect(source).toContain('management.can_configure');
    expect(source).toContain('management.can_manage_curriculum');
    expect(source).toContain('management.can_manage_subject_offerings');
  });

  it('does not expose blocked power toggles as the default discovery path', () => {
    const source = settingsSource();

    expect(source).toContain('management.can_toggle && canManagePluginConfiguration');
    expect(source).toContain('management.blocked_reason');
    expect(source).toContain('Customize appearance');
    expect(source).not.toContain('!plugin.is_core ?');
  });

  it('reconciles plugin mutations without reloading the page', () => {
    const source = settingsSource();

    expect(source).toContain('Promise.all([refetch(), refetchDisableRequests()])');
    expect(source).not.toContain('window.location.reload');
  });

  it('uses effective plugin state in plugin hooks', () => {
    expect(usePluginsSource()).toContain('p.effective_enabled ??');
  });
});
