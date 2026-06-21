'use client';

import { Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { ThemeModeSelector } from './ThemeModeSelector';

interface AppearanceSettingsCardProps {
  title?: string;
  description?: string;
  compact?: boolean;
}

export function AppearanceSettingsCard({
  title = 'Theme preference',
  description = 'Dark mode follows your device settings. Organization branding customization applies primarily to the light workspace theme.',
  compact = false,
}: AppearanceSettingsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/12 text-[color:var(--color-primary)]">
          <Palette className="h-5 w-5" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm theme-muted">{description}</p>
        </div>
      </CardHeader>
      <CardContent>
        <ThemeModeSelector compact={compact} />
      </CardContent>
    </Card>
  );
}
