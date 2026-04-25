// ============================================================================
// app/plugins/cambridge/pages/CambridgeSubjectDetailPage.tsx
//
// Subject detail — content areas, topics, learning objectives,
// assessment components.
// ============================================================================

'use client';

import { useParams } from 'next/navigation';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useCambridgeSubject, useContentAreas, useAssessmentComponents } from '../hooks';

export default function CambridgeSubjectDetailPage() {
  const params = useParams();
  const subjectId = Number(params.id);

  const { data: subject, isLoading: subjectLoading } = useCambridgeSubject(subjectId);
  const { data: contentAreas } = useContentAreas(subjectId);
  const { data: components } = useAssessmentComponents(subjectId);

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        {/* TODO: UI implementation */}
        {subjectLoading ? (
          <div>Loading subject...</div>
        ) : (
          <div>
            <h1>{subject?.name}</h1>
            <p>Code: {subject?.code}</p>
            <p>Content Areas: {contentAreas?.length ?? 0}</p>
            <p>Assessment Components: {components?.length ?? 0}</p>
          </div>
        )}
      </PermissionGuard>
    </TenantGuard>
  );
}
