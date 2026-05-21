'use client';

import { Check, Laptop, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeMode } from '@/app/context/ThemeContext';

interface ThemeModeSelectorProps {
  compact?: boolean;
  showResolvedTheme?: boolean;
  className?: string;
}

const THEME_OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: 'light',
    label: 'Light',
    description: 'Use a bright interface.',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Use the darker workspace palette.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Match this device setting.',
    icon: Laptop,
  },
];

export function ThemeModeSelector({
  compact = false,
  showResolvedTheme = true,
  className = '',
}: ThemeModeSelectorProps) {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  return (
    <div className={`space-y-3 ${className}`}>
      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'sm:grid-cols-3'}`}>
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = themeMode === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setThemeMode(option.value)}
              className={`theme-toggle-button ${active ? 'theme-toggle-button-active' : ''} ${
                compact ? 'min-h-12 px-3 py-2' : 'min-h-24 px-4 py-3'
              }`}
            >
              <div
                className={`flex w-full gap-3 ${compact ? 'items-center justify-center gap-2' : 'items-start'}`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'theme-text' : 'theme-muted'}`}
                />
                <div className={`min-w-0 flex-1 ${compact ? 'hidden' : 'text-left'}`}>
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="mt-1 text-xs theme-subtle">{option.description}</p>
                </div>
                {compact && <span className="text-sm font-medium">{option.label}</span>}
                {!compact && active && (
                  <Check className="h-4 w-4 shrink-0 text-[color:var(--color-primary)]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showResolvedTheme && (
        <p className="text-xs theme-subtle">
          Resolved theme: <span className="font-medium theme-muted">{resolvedTheme}</span>
        </p>
      )}
    </div>
  );
}
