'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { useCambridgeCohortSubjects, useCambridgeOfferings, useUpdateCambridgeOffering } from '../hooks';
import { modeLabel, mutationErrorMessage } from './authoringUtils';

export default function CambridgeSubjectManagementPage() {
  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';
  const [errorVisible, setErrorVisible] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: offerings = [], isLoading: offeringsLoading, error: offeringsError } = useCambridgeOfferings();
  const { data: cohortSubjects = [], isLoading: cohortSubjectsLoading } = useCambridgeCohortSubjects({ active: true });
  const updateOfferingMutation = useUpdateCambridgeOffering();

  const assignmentsByOffering = useMemo(() => {
    const grouped = new Map<number, typeof cohortSubjects>();
    cohortSubjects.forEach((assignment) => {
      const existing = grouped.get(assignment.offering_id) ?? [];
      existing.push(assignment);
      grouped.set(assignment.offering_id, existing);
    });
    return grouped;
  }, [cohortSubjects]);

  const loading = offeringsLoading || cohortSubjectsLoading;

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        <div className="space-y-6">
          <CambridgeWorkflowNav />
          <CambridgeBreadcrumb
            segments={[
              { label: 'Cambridge', href: '/cambridge' },
              { label: 'Subjects' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Cambridge Subject Assignments</h1>
              <p className="mt-1 text-sm text-gray-500">
                Organization-offered Cambridge subjects and the cohorts currently taking them.
              </p>
            </div>
            <Link href="/cambridge/setup" className="text-sm text-blue-600 hover:text-blue-700">
              Back to Setup
            </Link>
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading Cambridge offerings..." /> : null}

          {(offeringsError || actionError) && errorVisible ? (
            <ErrorBanner
              message={actionError ?? 'Failed to load Cambridge subject assignments.'}
              onDismiss={() => setErrorVisible(false)}
            />
          ) : null}

          {!loading && offerings.length === 0 ? (
            <Card>
              <h2 className="font-semibold text-gray-900">No Cambridge offerings available</h2>
              <p className="mt-2 text-sm text-gray-600">
                Add Cambridge subject offerings from setup before assigning them to cohorts.
              </p>
              <Link href="/cambridge/setup" className="mt-4 inline-flex text-sm text-blue-600 hover:text-blue-700">
                Open Cambridge Setup
              </Link>
            </Card>
          ) : null}

          {!loading && offerings.length > 0 ? (
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">Offered Subjects</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Select an offering to manage its cohort assignments.
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                {offerings.map((offering) => {
                  const assignments = assignmentsByOffering.get(offering.id) ?? [];
                  const activeVersion =
                    offering.structure_mode === 'QUALIFICATION' ? offering.active_syllabus : offering.active_framework;
                  const togglePending =
                    updateOfferingMutation.isPending && updateOfferingMutation.variables?.id === offering.id;

                  return (
                    <li key={offering.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{offering.subject_title}</p>
                          <p className="text-sm text-gray-600">
                            {offering.subject_code} · {modeLabel(offering.structure_mode)} · {offering.programme_title}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {activeVersion
                              ? `Active ${offering.structure_mode === 'QUALIFICATION' ? 'syllabus' : 'framework'}: ${activeVersion.version_label}`
                              : 'No active version'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              offering.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {offering.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {isAdmin ? (
                            <>
                              <Link
                                href={`/cambridge/offerings/${offering.id}/cohorts`}
                                className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                              >
                                Manage Cohorts
                              </Link>
                              <Button
                                size="sm"
                                variant={offering.is_active ? 'danger' : 'primary'}
                                disabled={togglePending}
                                onClick={async () => {
                                  setActionError(null);
                                  try {
                                    await updateOfferingMutation.mutateAsync({
                                      id: offering.id,
                                      payload: { is_active: !offering.is_active },
                                    });
                                  } catch (mutationError) {
                                    setActionError(mutationErrorMessage(mutationError));
                                    setErrorVisible(true);
                                  }
                                }}
                              >
                                {togglePending ? 'Saving...' : offering.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Assigned Cohorts</p>
                        {assignments.length === 0 ? (
                          <p className="mt-2 text-sm text-gray-600">No active cohort assignments yet.</p>
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {assignments.map((assignment) => (
                              <span
                                key={assignment.id}
                                className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700"
                              >
                                {assignment.cohort_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
