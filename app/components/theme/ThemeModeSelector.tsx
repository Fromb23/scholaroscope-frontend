'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/context/ThemeContext';

interface ThemeModeSelectorProps {
  compact?: boolean;
  showResolvedTheme?: boolean;
  className?: string;
}

export function ThemeModeSelector({
  compact = false,
  showResolvedTheme = true,
  className = '',
}: ThemeModeSelectorProps) {
  const { resolvedTheme } = useTheme();
  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className={`rounded-lg border theme-border theme-card-muted ${compact ? 'p-3' : 'p-4'} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="theme-brand-icon rounded-lg p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium theme-text">Dark mode follows your device settings.</p>
          {!compact ? (
            <p className="mt-1 text-xs theme-subtle">
              Scholaroscope uses your operating system or browser preference. Organization branding customizes the light workspace identity and remains visible in dark mode.
            </p>
          ) : null}
          {showResolvedTheme ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs theme-subtle">
              <Laptop className="h-3.5 w-3.5" />
              Current device theme: <span className="font-medium theme-muted">{resolvedTheme}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
