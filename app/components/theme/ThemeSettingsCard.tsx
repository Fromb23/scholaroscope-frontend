'use client';

import { Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { useAuth } from '@/app/context/AuthContext';
import { useEffectiveTheme } from '@/app/context/EffectiveThemeContext';
import {
  canEditOrganizationTheme,
} from '@/app/core/theme/effectiveTheme';
import { OrganizationThemeSettingsCard } from './OrganizationThemeSettingsCard';

interface ThemeSettingsCardProps {
  showOrganizationEditor?: boolean;
}

export function ThemeSettingsCard({ showOrganizationEditor = true }: ThemeSettingsCardProps) {
  const { user, activeOrg, activeRole, capabilities } = useAuth();
  const { effectiveTheme } = useEffectiveTheme();
  const canEditCustomTheme = canEditOrganizationTheme({ user, activeOrg, activeRole, capabilities });
  const showEditor = showOrganizationEditor && canEditCustomTheme;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <div className="theme-brand-icon flex h-10 w-10 items-center justify-center rounded-xl">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Organization branding</CardTitle>
            <p className="mt-1 text-sm theme-muted">
              Configure the light-mode brand colors inherited by everyone in this workspace.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border theme-border theme-surface-muted px-3 py-2 text-sm theme-muted">
            {effectiveTheme.is_customized
              ? 'This workspace has custom branding. Users see it automatically in Scholaroscope default light mode.'
              : 'This workspace is using Scholaroscope default branding.'}
          </p>
        </CardContent>
      </Card>

      {showEditor ? <OrganizationThemeSettingsCard /> : null}
    </div>
  );
}
