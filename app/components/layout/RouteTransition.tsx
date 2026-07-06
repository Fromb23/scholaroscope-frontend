'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type TransitionDirection = 'forward' | 'back';

interface TransitionState {
  pathname: string;
  direction: TransitionDirection;
  hasNavigated: boolean;
}

function routeDepth(pathname: string): number {
  return pathname.split('/').filter(Boolean).length;
}

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [transition, setTransition] = useState<TransitionState>({
    pathname,
    direction: 'forward',
    hasNavigated: false,
  });

  useEffect(() => {
    setTransition((previous) => {
      if (previous.pathname === pathname) return previous;
      return {
        pathname,
        direction: routeDepth(pathname) < routeDepth(previous.pathname) ? 'back' : 'forward',
        hasNavigated: true,
      };
    });
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={`mobile-route-transition ${
        transition.hasNavigated
          ? `mobile-route-transition-${transition.direction}`
          : 'mobile-route-transition-initial'
      }`}
    >
      {/* app/globals.css disables this wrapper under prefers-reduced-motion. */}
      {children}
    </div>
  );
}
