import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('ThemeSettingsCard', () => {
  it('keeps personal theme selection to Default and Dark by default', () => {
    const selectorSource = readFileSync(join(process.cwd(), 'app/components/theme/ThemeModeSelector.tsx'), 'utf8');

    expect(selectorSource).toContain("value: 'DEFAULT'");
    expect(selectorSource).toContain("label: 'Default Scholaroscope'");
    expect(selectorSource).toContain("value: 'DARK'");
    expect(selectorSource).toContain("label: 'Scholaroscope Dark'");
    expect(selectorSource).toContain("allowCustom = false");
    expect(selectorSource).toContain("option.value !== 'CUSTOM' || allowCustom");
  });

  it('describes settings as organization branding instead of device preference', () => {
    const settingsSource = readFileSync(join(process.cwd(), 'app/components/theme/ThemeSettingsCard.tsx'), 'utf8');
    const adminSettingsSource = readFileSync(join(process.cwd(), 'app/(dashboard)/admin/settings/page.tsx'), 'utf8');

    expect(settingsSource).toContain('Organization branding');
    expect(settingsSource).not.toContain('updateMyThemePreference');
    expect(adminSettingsSource).toContain('ThemeSettingsCard');
    expect(adminSettingsSource).not.toContain('AppearanceSettingsCard');
  });

  it('shows the organization editor when the user can edit organization branding', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/theme/ThemeSettingsCard.tsx'), 'utf8');

    expect(source).toContain('canEditCustomTheme');
    expect(source).toContain('<OrganizationThemeSettingsCard />');
  });
});
