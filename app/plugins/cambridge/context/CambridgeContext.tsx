// ============================================================================
// app/plugins/cambridge/context/CambridgeContext.tsx
//
// Plugin-wide React context for Cambridge state.
// Mounted via registerPluginProvider or route-scoped layout.
// ============================================================================

'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CambridgeProgramme, CambridgeLevel } from '../types';

interface CambridgeContextType {
  selectedProgramme: CambridgeProgramme | null;
  selectedLevel: CambridgeLevel | null;
  setSelectedProgramme: (programme: CambridgeProgramme | null) => void;
  setSelectedLevel: (level: CambridgeLevel | null) => void;
}

const CambridgeContext = createContext<CambridgeContextType | null>(null);

export function CambridgeProvider({ children }: { children: ReactNode }) {
  const [selectedProgramme, setSelectedProgramme] = useState<CambridgeProgramme | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<CambridgeLevel | null>(null);

  const handleSetProgramme = useCallback((programme: CambridgeProgramme | null) => {
    setSelectedProgramme(programme);
    setSelectedLevel(null);
  }, []);

  const handleSetLevel = useCallback((level: CambridgeLevel | null) => {
    setSelectedLevel(level);
  }, []);

  return (
    <CambridgeContext.Provider
      value={{
        selectedProgramme,
        selectedLevel,
        setSelectedProgramme: handleSetProgramme,
        setSelectedLevel: handleSetLevel,
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
