'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

import { formatDocumentTitle, resolvePageIdentity } from './pageIdentity';

interface PageTitleContextValue {
  setTitleOverride: (title: string | null) => void;
}

interface PathScopedTitleOverride {
  pathname: string;
  title: string;
}

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [titleOverride, setPathScopedTitleOverride] = useState<PathScopedTitleOverride | null>(null);

  const fallbackTitle = resolvePageIdentity(pathname).displayLabel;
  const activeTitleOverride = titleOverride?.pathname === pathname ? titleOverride.title : null;
  const documentTitle = formatDocumentTitle(activeTitleOverride ?? fallbackTitle);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  const value = useMemo<PageTitleContextValue>(() => ({
    setTitleOverride: (title) => {
      setPathScopedTitleOverride((current) => {
        if (title) return { pathname, title };
        return current?.pathname === pathname ? null : current;
      });
    },
  }), [pathname]);

  return (
    <PageTitleContext.Provider value={value}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function useSemanticPageTitle(title: string | null | undefined): void {
  const context = useContext(PageTitleContext);
  const normalized = title?.trim() || null;

  useEffect(() => {
    if (!context) return undefined;
    context.setTitleOverride(normalized);
    return () => {
      context.setTitleOverride(null);
    };
  }, [context, normalized]);
}
