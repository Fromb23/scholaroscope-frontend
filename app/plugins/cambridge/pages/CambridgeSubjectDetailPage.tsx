// ============================================================================
// app/plugins/cambridge/pages/CambridgeSubjectDetailPage.tsx
// ============================================================================

'use client';

import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
  useCambridgeAssessmentUnits,
  useCambridgeBrowserSubjects,
  useCambridgeLearningUnits,
  useCambridgeProgressDetail,
  useCambridgeSubject,
} from '../hooks';
import { LearningTree } from '../components/LearningTree';
import { AssessmentComponentList } from '../components/AssessmentComponentList';
import { ProgressCard } from '../components/ProgressCard';

export default function CambridgeSubjectDetailPage() {
  const params = useParams();
  const subjectId = Number(params.id ?? 0);
  const [errorVisible, setErrorVisible] = useState(true);

  const {
    data: installationSubject,
    isLoading: installationSubjectLoading,
    error: installationSubjectError,
  } = useCambridgeSubject(subjectId);
  const {
    data: normalizedSubjects = [],
    isLoading: normalizedSubjectsLoading,
    error: normalizedSubjectsError,
  } = useCambridgeBrowserSubjects();

  const normalizedSubject = useMemo(() => {
    if (!installationSubject) return null;
    return normalizedSubjects.find((item) => item.subject_id === installationSubject.subject_id) ?? null;
  }, [installationSubject, normalizedSubjects]);

  const normalizedSubjectId = normalizedSubject?.id ?? null;

  const { data: units = [], isLoading: unitsLoading, error: unitsError } =
    useCambridgeLearningUnits(normalizedSubjectId);
  const { data: assessmentUnits = [], isLoading: assessmentLoading, error: assessmentError } =
    useCambridgeAssessmentUnits(normalizedSubjectId);
  const { data: progress, isLoading: progressLoading, error: progressError } =
    useCambridgeProgressDetail(normalizedSubjectId);

  const loading =
    installationSubjectLoading ||
    normalizedSubjectsLoading ||
    unitsLoading ||
    assessmentLoading ||
    progressLoading;
  const hasError =
    installationSubjectError ||
    normalizedSubjectsError ||
    unitsError ||
    assessmentError ||
    progressError;

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        <div className="space-y-6">
          {loading ? <LoadingSpinner fullScreen={false} message="Loading Cambridge subject..." /> : null}

          {hasError && errorVisible ? (
            <ErrorBanner
              message="Failed to load one or more Cambridge subject details."
              onDismiss={() => setErrorVisible(false)}
            />
          ) : null}

          {!loading && !installationSubject ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Subject not found</h2>
              <p className="text-sm text-gray-600 mt-2">
                The subject is unavailable or not visible in your assigned Cambridge access scope.
              </p>
            </Card>
          ) : null}

          {!loading && installationSubject ? (
            <>
              <Card>
                <h1 className="text-xl font-semibold text-gray-900">{installationSubject.display_name}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {installationSubject.subject_code ?? 'No code'} · {installationSubject.programme_code ?? 'No programme'} ·{' '}
                  {installationSubject.structure_mode ?? 'Unknown structure'}
                </p>
                <p className="text-sm mt-2">
                  Status:{' '}
                  <span className={installationSubject.enabled ? 'text-green-700' : 'text-gray-500'}>
                    {installationSubject.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </p>
              </Card>

              {!normalizedSubject ? (
                <Card>
                  <h2 className="font-semibold text-gray-900">No normalized subject projection</h2>
                  <p className="text-sm text-gray-600 mt-2">
                    This installation subject currently has no visible normalized Cambridge projection for your access.
                  </p>
                </Card>
              ) : (
                <>
                  <Card>
                    <h2 className="font-semibold text-gray-900">Normalized Subject</h2>
                    <p className="text-sm text-gray-600 mt-2">
                      {normalizedSubject.title} · {normalizedSubject.programme_code} · {normalizedSubject.structure_mode}
                    </p>
                  </Card>

                  <Card>
                    <h2 className="font-semibold text-gray-900 mb-3">Learning Units</h2>
                    {units.length === 0 ? (
                      <p className="text-sm text-gray-600">No learning units found.</p>
                    ) : (
                      <LearningTree units={units} />
                    )}
                  </Card>

                  <Card>
                    <h2 className="font-semibold text-gray-900 mb-3">Assessment Units</h2>
                    {assessmentUnits.length === 0 ? (
                      <p className="text-sm text-gray-600">No assessment units available for this subject.</p>
                    ) : (
                      <AssessmentComponentList components={assessmentUnits} />
                    )}
                  </Card>

                  <Card>
                    <h2 className="font-semibold text-gray-900 mb-3">Progress Summary</h2>
                    {progress ? (
                      <ProgressCard progress={progress} />
                    ) : (
                      <p className="text-sm text-gray-600">Progress has not been computed yet for this subject.</p>
                    )}
                  </Card>
                </>
              )}
            </>
          ) : null}
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
