// ============================================================================
// app/plugins/cambridge/pages/CambridgeSubjectManagementPage.tsx
//
// Manage Cambridge subjects — list, create, edit, delete.
// ============================================================================

'use client';

import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useCambridgeSubjects, useDeleteCambridgeSubject } from '../hooks';

export default function CambridgeSubjectManagementPage() {
  const { data: subjects, isLoading } = useCambridgeSubjects();
  const deleteSubject = useDeleteCambridgeSubject();

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        {/* TODO: UI implementation */}
        {isLoading ? (
          <div>Loading subjects...</div>
        ) : (
          <div>
            <h1>Cambridge Subjects</h1>
            <p>{subjects?.length ?? 0} subjects found</p>
          </div>
        )}
      </PermissionGuard>
    </TenantGuard>
  );
}
