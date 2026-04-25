// ============================================================================
// app/plugins/cambridge/pages/CambridgeDashboardPage.tsx
//
// Cambridge plugin landing page.
// Shows installation gate or programme overview.
// ============================================================================

'use client';

import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useCambridgeInstallation } from '../hooks';

export default function CambridgeDashboardPage() {
  const { data: installation, isLoading } = useCambridgeInstallation();

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        {/* TODO: UI implementation */}
        {isLoading ? (
  <div>Loading...</div>
) : !installation ? (
  <div>Cambridge not installed. Redirect to setup.</div>
) : !installation.enabled ? (
  <div>Cambridge installed but disabled.</div>
) : (
  <div>Cambridge Dashboard</div>
)}
      </PermissionGuard>
    </TenantGuard>
  );
}
