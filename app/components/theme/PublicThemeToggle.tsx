'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/context/ThemeContext';

interface PublicThemeToggleProps {
  className?: string;
  labelClassName?: string;
}

export function PublicThemeToggle({ className = '', labelClassName = '' }: PublicThemeToggleProps) {
  const { isDark, setThemeMode } = useTheme();
  const nextMode = isDark ? 'DEFAULT' : 'DARK';
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setThemeMode(nextMode)}
      className={`theme-focus-ring inline-flex items-center gap-2 rounded-full border theme-border theme-surface px-3 py-2 text-xs font-semibold theme-text shadow-[var(--shadow-soft)] transition-colors theme-hover-surface ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <Icon className="h-4 w-4 theme-icon-emphasis" />
      <span className={labelClassName}>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
