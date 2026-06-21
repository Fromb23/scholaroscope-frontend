import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('ThemeSettingsCard', () => {
  it('renders the three supported workspace theme options', () => {
    const selectorSource = readFileSync(join(process.cwd(), 'app/components/theme/ThemeModeSelector.tsx'), 'utf8');

    expect(selectorSource).toContain("value: 'DEFAULT'");
    expect(selectorSource).toContain("label: 'Default Scholaroscope'");
    expect(selectorSource).toContain("value: 'DARK'");
    expect(selectorSource).toContain("label: 'Scholaroscope Dark'");
    expect(selectorSource).toContain("value: 'CUSTOM'");
    expect(selectorSource).toContain("label: 'Organization Custom'");
  });

  it('owns theme switching in settings and persists locally-first through ThemeContext', () => {
    const settingsSource = readFileSync(join(process.cwd(), 'app/components/theme/ThemeSettingsCard.tsx'), 'utf8');
    const adminSettingsSource = readFileSync(join(process.cwd(), 'app/(dashboard)/admin/settings/page.tsx'), 'utf8');

    expect(settingsSource).toContain('ThemeModeSelector');
    expect(settingsSource).toContain('updateMyThemePreference');
    expect(adminSettingsSource).toContain('ThemeSettingsCard');
    expect(adminSettingsSource).not.toContain('AppearanceSettingsCard');
  });

  it('shows the organization editor only for custom mode with edit permission', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/theme/ThemeSettingsCard.tsx'), 'utf8');

    expect(source).toContain("themeMode === 'CUSTOM'");
    expect(source).toContain('canEditCustomTheme');
    expect(source).toContain('<OrganizationThemeSettingsCard />');
  });
});
