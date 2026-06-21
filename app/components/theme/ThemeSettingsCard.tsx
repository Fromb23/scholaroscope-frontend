'use client';

import { Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import { useEffectiveTheme } from '@/app/context/EffectiveThemeContext';
import { themeAPI } from '@/app/core/api/theme';
import {
  canEditOrganizationTheme,
  themeModeToAppearanceMode,
} from '@/app/core/theme/effectiveTheme';
import { ThemeModeSelector } from './ThemeModeSelector';
import { OrganizationThemeSettingsCard } from './OrganizationThemeSettingsCard';
import type { ScholaroscopeThemeMode } from '@/app/context/ThemeContext';

interface ThemeSettingsCardProps {
  showOrganizationEditor?: boolean;
}

export function ThemeSettingsCard({ showOrganizationEditor = true }: ThemeSettingsCardProps) {
  const { user, activeOrg, activeRole, capabilities } = useAuth();
  const { themeMode } = useTheme();
  const { effectiveTheme } = useEffectiveTheme();
  const canEditCustomTheme = canEditOrganizationTheme({ user, activeOrg, activeRole, capabilities });
  const canUseCustomTheme = Boolean(activeOrg && canEditCustomTheme);

  const persistPreference = (mode: ScholaroscopeThemeMode) => {
    void themeAPI.updateMyThemePreference({
      appearance_mode: themeModeToAppearanceMode(mode),
    }).catch(() => undefined);
  };

  const showCustomPrompt = themeMode === 'CUSTOM' && !effectiveTheme.is_customized;
  const showEditor = showOrganizationEditor && themeMode === 'CUSTOM' && canEditCustomTheme;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <div className="theme-brand-icon flex h-10 w-10 items-center justify-center rounded-xl">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Theme preference</CardTitle>
            <p className="mt-1 text-sm theme-muted">
              Choose how this workspace appears on this device. Organization custom theme uses the active workspace brand colors. Scholaroscope Dark is controlled by Scholaroscope for readability.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <ThemeModeSelector
            allowCustom={canUseCustomTheme}
            onModeChange={persistPreference}
          />
          {themeMode === 'CUSTOM' && !canUseCustomTheme ? (
            <p className="mt-3 rounded-lg border theme-border theme-surface-muted px-3 py-2 text-sm theme-muted">
              Organization custom theme can only be selected by workspace administrators who can manage organization branding.
            </p>
          ) : null}
          {showCustomPrompt ? (
            <p className="mt-3 rounded-lg border theme-border theme-surface-muted px-3 py-2 text-sm theme-muted">
              This workspace has not saved custom colors yet. Organization Custom will use the current workspace/default brand until colors are saved.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {showEditor ? <OrganizationThemeSettingsCard /> : null}
    </div>
  );
}
