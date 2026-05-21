'use client';

import type { ReactNode } from 'react';
import { ThemeModeSelector } from '@/app/components/theme/ThemeModeSelector';
import { themeClasses } from '@/app/core/theme/themeClasses';

interface AuthFrameProps {
  children: ReactNode;
  maxWidthClassName?: string;
}

export function AuthFrame({ children, maxWidthClassName = 'max-w-md' }: AuthFrameProps) {
  return (
    <div className={`${themeClasses.authPage} theme-app-bg flex items-center justify-center`}>
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: 'radial-gradient(circle at top, rgba(37, 99, 235, 0.24), transparent 55%)',
        }}
      />
      <div className="absolute right-4 top-4 z-10 w-full max-w-[252px] sm:right-6 sm:top-6">
        <ThemeModeSelector compact showResolvedTheme={false} />
      </div>
      <div className={`relative z-10 w-full ${maxWidthClassName}`}>{children}</div>
    </div>
  );
}
