// ============================================================================
// app/plugins/cambridge/pages/CambridgeProgressPage.tsx
// ============================================================================

'use client';

import { useMemo, useState } from 'react';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
  useCambridgeBrowserSubjects,
  useCambridgeLearningUnits,
  useCambridgeProgressDetail,
  useCambridgeProgressList,
} from '../hooks';
import { SubjectBrowserList } from '../components/SubjectBrowserList';
import { ProgressCard } from '../components/ProgressCard';
import { LearningTree } from '../components/LearningTree';

export default function CambridgeProgressPage() {
  const [selectedNormalizedSubjectId, setSelectedNormalizedSubjectId] = useState<number | null>(null);
  const [errorVisible, setErrorVisible] = useState(true);

  const {
    data: normalizedSubjects = [],
    isLoading: subjectsLoading,
    error: subjectsError,
  } = useCambridgeBrowserSubjects();
  const {
    data: progressList = [],
    isLoading: progressListLoading,
    error: progressListError,
  } = useCambridgeProgressList();

  const selectedSubjectId = selectedNormalizedSubjectId ?? normalizedSubjects[0]?.id ?? null;
  const {
    data: selectedProgress,
    isLoading: selectedProgressLoading,
    error: selectedProgressError,
  } = useCambridgeProgressDetail(selectedSubjectId);
  const { data: units = [], isLoading: unitsLoading, error: unitsError } = useCambridgeLearningUnits(selectedSubjectId);

  const progressBySubjectId = useMemo(() => {
    const map = new Map<number, (typeof progressList)[number]>();
    for (const item of progressList) {
      map.set(item.normalized_subject_id, item);
    }
    return map;
  }, [progressList]);

  const loading = subjectsLoading || progressListLoading || selectedProgressLoading || unitsLoading;
  const hasError = subjectsError || progressListError || selectedProgressError || unitsError;

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Cambridge Progress</h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse normalized subjects and inspect progress plus normalized learning units.
            </p>
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading Cambridge progress..." /> : null}

          {hasError && errorVisible ? (
            <ErrorBanner
              message="Failed to load Cambridge progress data."
              onDismiss={() => setErrorVisible(false)}
            />
          ) : null}

          {!loading && normalizedSubjects.length === 0 ? (
            <Card>
              <h2 className="font-semibold text-gray-900">No normalized subjects</h2>
              <p className="text-sm text-gray-600 mt-2">
                No Cambridge normalized subjects are visible for your role and assignments.
              </p>
            </Card>
          ) : null}

          {!loading && normalizedSubjects.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <h2 className="font-semibold text-gray-900 mb-3">Subjects</h2>
                <SubjectBrowserList
                  subjects={normalizedSubjects}
                  selectedId={selectedSubjectId}
                  onSelect={(subject) => setSelectedNormalizedSubjectId(subject.id)}
                />
              </Card>

              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <h2 className="font-semibold text-gray-900 mb-3">Progress Summary</h2>
                  {selectedProgress ? (
                    <ProgressCard progress={selectedProgress} />
                  ) : selectedSubjectId && progressBySubjectId.get(selectedSubjectId) ? (
                    <ProgressCard progress={progressBySubjectId.get(selectedSubjectId)!} />
                  ) : (
                    <p className="text-sm text-gray-600">No progress data available for this subject.</p>
                  )}
                </Card>

                <Card>
                  <h2 className="font-semibold text-gray-900 mb-3">Learning Units</h2>
                  {units.length === 0 ? (
                    <p className="text-sm text-gray-600">No normalized units found for the selected subject.</p>
                  ) : (
                    <LearningTree units={units} />
                  )}
                </Card>
              </div>
            </div>
          ) : null}
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
