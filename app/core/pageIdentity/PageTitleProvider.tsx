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

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [titleOverride, setTitleOverride] = useState<string | null>(null);

  useEffect(() => {
    setTitleOverride(null);
  }, [pathname]);

  const fallbackTitle = resolvePageIdentity(pathname).displayLabel;
  const documentTitle = formatDocumentTitle(titleOverride ?? fallbackTitle);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  const value = useMemo<PageTitleContextValue>(() => ({ setTitleOverride }), []);

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
