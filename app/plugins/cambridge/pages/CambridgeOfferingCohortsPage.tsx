'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useAuth } from '@/app/context/AuthContext';
import { useCohorts, useCurricula } from '@/app/core/hooks/useAcademic';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import {
  CAMBRIDGE_BRIDGE_NAME,
  getCurriculumBridgeName,
  isCambridgeCurriculum,
  isCambridgeCurriculumType,
} from '@/app/core/lib/curriculumBridge';
import { CambridgeFormModal } from '../components/CambridgeAuthoringModals';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import {
  useAssignCambridgeOfferingToCohort,
  useCambridgeOffering,
  useCambridgeOfferingCohorts,
  useDeactivateCambridgeCohortSubject,
} from '../hooks';
import { modeLabel, mutationErrorMessage, toPositiveNumber } from './authoringUtils';

export default function CambridgeOfferingCohortsPage() {
  const params = useParams<{ offeringId: string }>();
  const pathname = usePathname();
  const offeringId = toPositiveNumber(params.offeringId);
  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';

  const [errorVisible, setErrorVisible] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState('');

  const { data: offering, isLoading: offeringLoading, error: offeringError } = useCambridgeOffering(offeringId);
  const {
    data: assignments = [],
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useCambridgeOfferingCohorts(offeringId, true);
  const { curricula, loading: curriculaLoading } = useCurricula();
  const { cohorts, loading: cohortsLoading } = useCohorts(undefined, { enabled: true });
  const assignMutation = useAssignCambridgeOfferingToCohort();
  const deactivateMutation = useDeactivateCambridgeCohortSubject();

  const matchingCurricula = useMemo(
    () => curricula.filter((curriculum) => isCambridgeCurriculum(curriculum)),
    [curricula]
  );
  const preferredCurriculum = useMemo(
    () => matchingCurricula.find((curriculum) => curriculum.is_active && getCurriculumBridgeName(curriculum) === CAMBRIDGE_BRIDGE_NAME)
      ?? matchingCurricula.find((curriculum) => curriculum.is_active)
      ?? matchingCurricula[0]
      ?? null,
    [matchingCurricula]
  );
  const preferredCurriculumId = preferredCurriculum?.id;
  const assignedCohortIds = useMemo(() => new Set(assignments.map((assignment) => assignment.cohort)), [assignments]);
  const matchingCohorts = useMemo(
    () => cohorts.filter((cohort) => isCambridgeCurriculum(cohort)),
    [cohorts]
  );
  const assignableCohorts = useMemo(
    () => matchingCohorts.filter((cohort) => !assignedCohortIds.has(cohort.id)),
    [assignedCohortIds, matchingCohorts]
  );
  const cohortOptions = useMemo(
    () => [
      { value: '', label: 'Select cohort' },
      ...assignableCohorts.map((cohort) => ({
        value: cohort.id,
        label: `${cohort.name} · ${getCurriculumBridgeName(cohort)} · ${cohort.academic_year_name}`,
      })),
    ],
    [assignableCohorts]
  );

  const createCohortParams = new URLSearchParams({
    create: '1',
    returnTo: pathname || `/cambridge/offerings/${offeringId}/cohorts`,
  });
  if (offering?.programme_code && isCambridgeCurriculumType(offering.programme_code)) {
    createCohortParams.set('curriculum_type', offering.programme_code);
  }
  if (preferredCurriculumId) {
    createCohortParams.set('curriculum', String(preferredCurriculumId));
  }
  const createCohortHref = `/academic/cohorts?${createCohortParams.toString()}`;
  const loading = offeringLoading || assignmentsLoading || curriculaLoading || cohortsLoading;
  const activeVersion = offering?.structure_mode === 'QUALIFICATION' ? offering.active_syllabus : offering?.active_framework;
  const hasMatchingCohorts = matchingCohorts.length > 0;
  const allMatchingCohortsAssigned = hasMatchingCohorts && assignableCohorts.length === 0;

  const runAction = async (work: () => Promise<void>) => {
    setActionError(null);
    try {
      await work();
    } catch (actionFailure) {
      setActionError(mutationErrorMessage(actionFailure));
      setErrorVisible(true);
    }
  };

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN']}>
        <div className="space-y-6">
          <CambridgeWorkflowNav />
          <CambridgeBreadcrumb
            segments={[
              { label: 'Cambridge', href: '/cambridge' },
              { label: 'Subjects', href: '/cambridge/subjects' },
              { label: offering?.subject_title ?? 'Offering' },
              { label: 'Cohorts' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Offering Cohorts</h1>
              <p className="mt-1 text-sm text-gray-500">
                Assign or unassign cohorts for the selected Cambridge subject offering.
              </p>
            </div>
            <Link href="/cambridge/subjects" className="text-sm text-blue-600 hover:text-blue-700">
              Back to Subjects
            </Link>
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading offering cohorts..." /> : null}

          {(offeringError || assignmentsError || actionError) && errorVisible ? (
            <ErrorBanner
              message={actionError ?? 'Failed to load Cambridge offering cohort assignments.'}
              onDismiss={() => setErrorVisible(false)}
            />
          ) : null}

          {!loading && !offering ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Offering not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Return to Cambridge subjects and select a valid offering.
              </p>
            </Card>
          ) : null}

          {!loading && offering ? (
            <>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">{offering.subject_title}</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {offering.subject_code} · {modeLabel(offering.structure_mode)} · {offering.programme_title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {activeVersion
                        ? `Active ${offering.structure_mode === 'QUALIFICATION' ? 'syllabus' : 'framework'}: ${activeVersion.version_label}`
                        : 'No active version'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Matching curriculum: {preferredCurriculum ? getCurriculumBridgeName(preferredCurriculum) : CAMBRIDGE_BRIDGE_NAME}
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
                      <Button
                        onClick={() => {
                          setAssignModalOpen(true);
                          setActionError(null);
                        }}
                        disabled={!offering.is_active || assignableCohorts.length === 0}
                      >
                        Assign Cohort
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>

              {isAdmin && !cohortsLoading && !hasMatchingCohorts ? (
                <Card>
                  <h2 className="font-semibold text-gray-900">Create a cohort for this curriculum</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    No cohorts exist yet for {preferredCurriculum ? getCurriculumBridgeName(preferredCurriculum) : CAMBRIDGE_BRIDGE_NAME}.
                  </p>
                  <div className="mt-4">
                    <Link href={createCohortHref} className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50">
                      Create Cohort
                    </Link>
                  </div>
                </Card>
              ) : null}

              <Card>
                <h2 className="font-semibold text-gray-900">Assigned Cohorts</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Cambridge cohort assignment is delivery-level only. Frameworks and syllabuses are never assigned directly.
                </p>

                {assignments.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-5">
                    <h3 className="font-medium text-gray-900">No cohorts assigned</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Assign this offering to one or more cohorts to make it visible in Cambridge subject delivery.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {assignments.map((assignment) => (
                      <li key={assignment.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{assignment.cohort_name}</p>
                            <p className="text-sm text-gray-600">{assignment.cohort_level}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                              Active
                            </span>
                            {isAdmin ? (
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={deactivateMutation.isPending && deactivateMutation.variables === assignment.id}
                                onClick={() => {
                                  runAction(async () => {
                                    await deactivateMutation.mutateAsync(assignment.id);
                                  });
                                }}
                              >
                                {deactivateMutation.isPending && deactivateMutation.variables === assignment.id
                                  ? 'Removing...'
                                  : 'Unassign Cohort'}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          ) : null}

          <CambridgeFormModal
            isOpen={assignModalOpen}
            onClose={() => {
              setAssignModalOpen(false);
              setSelectedCohortId('');
              setActionError(null);
            }}
            title="Assign Cohort"
            description="Select a cohort to receive this offered Cambridge subject."
            submitLabel="Assign Cohort"
            submitting={assignMutation.isPending}
            errorMessage={actionError}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (!offeringId) return;
              const cohortId = toPositiveNumber(selectedCohortId);
              if (!cohortId) {
                setActionError('Select a cohort before saving.');
                return;
              }
              runAction(async () => {
                await assignMutation.mutateAsync({ offeringId, cohort: cohortId });
                setAssignModalOpen(false);
                setSelectedCohortId('');
              });
            }}
          >
            <Select
              label="Cohort"
              value={selectedCohortId}
              onChange={(event) => setSelectedCohortId(event.target.value)}
              options={cohortOptions}
              disabled={cohortsLoading || assignableCohorts.length === 0}
            />
            {!hasMatchingCohorts ? (
              <p className="text-sm text-gray-500">
                No cohorts exist for this curriculum yet. Create one in Academic setup, then return here.
              </p>
            ) : allMatchingCohortsAssigned ? (
              <p className="text-sm text-gray-500">
                All cohorts in this curriculum are already assigned to this offering.
              </p>
            ) : null}
          </CambridgeFormModal>
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
