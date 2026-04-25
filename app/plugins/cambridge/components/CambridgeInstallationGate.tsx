// ============================================================================
// app/plugins/cambridge/components/CambridgeInstallationGate.tsx
//
// Conditionally renders children only when Cambridge is installed and active.
// ============================================================================

'use client';

import type { ReactNode } from 'react';
import { useCambridgeInstallation } from '../hooks';

interface CambridgeInstallationGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function CambridgeInstallationGate({
  children,
  fallback = null,
}: CambridgeInstallationGateProps) {
  const { data: installation, isLoading } = useCambridgeInstallation();

  if (isLoading) {
    return <div>Checking Cambridge status...</div>;
  }

  if (!installation || !installation.enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
