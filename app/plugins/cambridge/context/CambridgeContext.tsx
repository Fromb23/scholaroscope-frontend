// ============================================================================
// app/plugins/cambridge/context/CambridgeContext.tsx
//
// Plugin-wide React context for Cambridge state.
// Mounted via registerPluginProvider or route-scoped layout.
// ============================================================================

'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface CambridgeContextType {
  selectedNormalizedSubjectId: number | null;
  setSelectedNormalizedSubjectId: (normalizedSubjectId: number | null) => void;
}

const CambridgeContext = createContext<CambridgeContextType | null>(null);

export function CambridgeProvider({ children }: { children: ReactNode }) {
  const [selectedNormalizedSubjectId, setSelectedNormalizedSubjectId] = useState<number | null>(null);

  const handleSetNormalizedSubject = useCallback((normalizedSubjectId: number | null) => {
    setSelectedNormalizedSubjectId(normalizedSubjectId);
  }, []);

  return (
    <CambridgeContext.Provider
      value={{
        selectedNormalizedSubjectId,
        setSelectedNormalizedSubjectId: handleSetNormalizedSubject,
      }}
    >
      {children}
    </CambridgeContext.Provider>
  );
}

export function useCambridgeContext() {
  const ctx = useContext(CambridgeContext);
  if (!ctx) throw new Error('useCambridgeContext must be used within CambridgeProvider');
  return ctx;
}
