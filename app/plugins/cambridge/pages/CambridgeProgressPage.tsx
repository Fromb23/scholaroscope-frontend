// ============================================================================
// app/plugins/cambridge/pages/CambridgeProgressPage.tsx
//
// Class and student progress overview for Cambridge subjects.
// ============================================================================

'use client';

import { useSearchParams } from 'next/navigation';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useSubjectProgress } from '../hooks';
import type { ProgressFilterParams } from '../types';

export default function CambridgeProgressPage() {
  const searchParams = useSearchParams();
  const cohortId = searchParams.get('cohort_id');
  const subjectId = searchParams.get('subject_id');

  const params: ProgressFilterParams = {
    cohort_id: cohortId ? Number(cohortId) : undefined,
    subject_id: subjectId ? Number(subjectId) : undefined,
  };

  const { data: progress, isLoading } = useSubjectProgress(params);

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        {/* TODO: UI implementation */}
        {isLoading ? (
          <div>Loading progress...</div>
        ) : (
          <div>
            <h1>Cambridge Progress</h1>
            <p>{progress?.length ?? 0} student records</p>
          </div>
        )}
      </PermissionGuard>
    </TenantGuard>
  );
}
