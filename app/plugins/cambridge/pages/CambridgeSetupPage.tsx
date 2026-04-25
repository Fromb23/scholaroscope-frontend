// ============================================================================
// app/plugins/cambridge/pages/CambridgeSetupPage.tsx
//
// Cambridge plugin installation and configuration page.
// Admin-only.
// ============================================================================

'use client';

import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useCambridgeInstallation, useActivateCambridge } from '../hooks';

export default function CambridgeSetupPage() {
  const { data: installation, isLoading } = useCambridgeInstallation();
  const activate = useActivateCambridge();

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN']}>
        {/* TODO: UI implementation */}
        {isLoading ? (
          <div>Loading...</div>
        ) : installation?.is_active ? (
          <div>Cambridge is active. Configuration options here.</div>
        ) : (
          <div>
            <p>Cambridge needs activation.</p>
            <button onClick={() => activate.mutate()}>Activate Cambridge</button>
          </div>
        )}
      </PermissionGuard>
    </TenantGuard>
  );
}
