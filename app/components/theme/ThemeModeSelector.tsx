'use client';

import { Check, Moon, Palette, Sun } from 'lucide-react';
import type { ScholaroscopeThemeMode } from '@/app/context/ThemeContext';
import { useTheme } from '@/app/context/ThemeContext';

interface ThemeModeSelectorProps {
  compact?: boolean;
  className?: string;
  allowCustom?: boolean;
  disabledModes?: ScholaroscopeThemeMode[];
  onModeChange?: (mode: ScholaroscopeThemeMode) => void;
}

export const THEME_OPTIONS: Array<{
  value: ScholaroscopeThemeMode;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: 'DEFAULT',
    label: 'Default Scholaroscope',
    description: 'Stable Scholaroscope light palette with no organization colors in global UI.',
    icon: Sun,
  },
  {
    value: 'DARK',
    label: 'Scholaroscope Dark',
    description: 'Fixed Scholaroscope-owned dark palette with subtle borders and readable surfaces.',
    icon: Moon,
  },
  {
    value: 'CUSTOM',
    label: 'Organization Custom',
    description: 'Uses active workspace brand colors for buttons, links, selected states, and accents.',
    icon: Palette,
  },
];

export function ThemeModeSelector({
  compact = false,
  className = '',
  allowCustom = false,
  disabledModes = [],
  onModeChange,
}: ThemeModeSelectorProps) {
  const { themeMode, setThemeMode } = useTheme();

  const handleSelect = (mode: ScholaroscopeThemeMode) => {
    setThemeMode(mode);
    onModeChange?.(mode);
  };

  return (
    <div className={`grid gap-3 ${compact ? '' : 'sm:grid-cols-3'} ${className}`}>
      {THEME_OPTIONS.filter((option) => option.value !== 'CUSTOM' || allowCustom).map((option) => {
        const Icon = option.icon;
        const selected = themeMode === option.value;
        const disabled = disabledModes.includes(option.value) || (option.value === 'CUSTOM' && !allowCustom);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            disabled={disabled}
            className={`theme-focus-ring rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
              selected ? 'theme-brand-selected' : 'theme-card-muted theme-hover-surface'
            }`}
            aria-pressed={selected}
          >
            <span className="mb-3 flex items-center justify-between gap-3">
              <span className="theme-brand-icon flex h-9 w-9 items-center justify-center rounded-lg">
                <Icon className="h-4 w-4" />
              </span>
              {selected ? <Check className="h-4 w-4 theme-icon-emphasis" /> : null}
            </span>
            <span className="block text-sm font-semibold theme-text">{option.label}</span>
            {!compact ? (
              <span className="mt-1 block text-xs leading-5 theme-muted">
                {option.description}
                {option.value === 'CUSTOM' && disabled ? ' Admin access is required.' : ''}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
