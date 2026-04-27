'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { CambridgeFormModal } from '../components/CambridgeAuthoringModals';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import {
  useCambridgeCohortSubjects,
  useCambridgeProgrammeSubjects,
  useCreateCambridgeSubjectOffering,
  useUpdateCambridgeOffering,
} from '../hooks';
import { modeLabel, mutationErrorMessage, toPositiveNumber } from './authoringUtils';
import type {
  CambridgeAvailableSubjectProfile,
  CambridgeFrameworkVersionSummary,
  CambridgeSubjectOffering,
  CambridgeSyllabusVersionSummary,
} from '../types';

function defaultFrameworkId(subject: CambridgeAvailableSubjectProfile) {
  return subject.active_framework?.id ?? subject.frameworks.find((item) => item.is_current)?.id ?? subject.frameworks[0]?.id ?? null;
}

function defaultSyllabusId(subject: CambridgeAvailableSubjectProfile) {
  return subject.active_syllabus?.id ?? subject.syllabuses.find((item) => item.is_current)?.id ?? subject.syllabuses[0]?.id ?? null;
}

function versionLabel(version: CambridgeFrameworkVersionSummary | CambridgeSyllabusVersionSummary | null) {
  if (!version) return 'No active version selected';
  if ('effective_from' in version) {
    return `Framework ${version.version_label} · ${version.effective_from}${version.effective_to ? `-${version.effective_to}` : '+'}`;
  }
  return `Syllabus ${version.version_label} · ${version.valid_from_year}${version.valid_to_year ? `-${version.valid_to_year}` : '+'}`;
}

export default function CambridgeInstallationProgrammeSubjectsPage() {
  const params = useParams<{ programmeId: string }>();
  const programmeId = toPositiveNumber(params.programmeId);
  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';

  const [errorVisible, setErrorVisible] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createSubject, setCreateSubject] = useState<CambridgeAvailableSubjectProfile | null>(null);
  const [editOffering, setEditOffering] = useState<CambridgeSubjectOffering | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState('');

  const {
    data: programmeSubjects,
    isLoading,
    error,
  } = useCambridgeProgrammeSubjects(programmeId);
  const { data: cohortSubjects = [] } = useCambridgeCohortSubjects({ active: true });
  const createOfferingMutation = useCreateCambridgeSubjectOffering(programmeId);
  const updateOfferingMutation = useUpdateCambridgeOffering();

  const programme = programmeSubjects?.programme ?? null;
  const availableSubjects = programmeSubjects?.available_subjects ?? [];
  const offeredSubjects = programmeSubjects?.offered_subjects ?? [];

  useEffect(() => {
    if (!createSubject) {
      setSelectedVersionId('');
      return;
    }
    setSelectedVersionId(
      createSubject.structure_mode === 'QUALIFICATION'
        ? String(defaultSyllabusId(createSubject) ?? '')
        : String(defaultFrameworkId(createSubject) ?? '')
    );
  }, [createSubject]);

  useEffect(() => {
    if (!editOffering) {
      setSelectedVersionId('');
      return;
    }
    setSelectedVersionId(
      editOffering.structure_mode === 'QUALIFICATION'
        ? String(editOffering.active_syllabus?.id ?? '')
        : String(editOffering.active_framework?.id ?? '')
    );
  }, [editOffering]);

  const assignmentsByOffering = useMemo(() => {
    const map = new Map<number, typeof cohortSubjects>();
    cohortSubjects.forEach((item) => {
      const existing = map.get(item.offering_id) ?? [];
      existing.push(item);
      map.set(item.offering_id, existing);
    });
    return map;
  }, [cohortSubjects]);

  const hasError = Boolean(error);
  const programmeDisabled = Boolean(programme && !programme.enabled);

  const runAction = async (work: () => Promise<void>) => {
    setActionError(null);
    try {
      await work();
    } catch (actionFailure) {
      setActionError(mutationErrorMessage(actionFailure));
    }
  };

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        <div className="space-y-6">
          <CambridgeWorkflowNav />
          <CambridgeBreadcrumb
            segments={[
              { label: 'Cambridge', href: '/cambridge' },
              { label: 'Setup', href: '/cambridge/setup' },
              { label: programme?.title ?? 'Programme' },
              { label: 'Subjects' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Programme Subjects</h1>
              <p className="mt-1 text-sm text-gray-500">
                Choose which catalogue subjects this organization actually offers under the selected programme.
              </p>
            </div>
            <Link href="/cambridge/setup" className="text-sm text-blue-600 hover:text-blue-700">
              Back to Setup
            </Link>
          </div>

          {isLoading ? <LoadingSpinner fullScreen={false} message="Loading programme subjects..." /> : null}

          {hasError && errorVisible ? (
            <ErrorBanner message="Failed to load programme subject management." onDismiss={() => setErrorVisible(false)} />
          ) : null}

          {!isLoading && !programme ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Programme not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Select a programme from Cambridge setup to continue.
              </p>
              <Link href="/cambridge/setup" className="mt-3 inline-block text-sm text-blue-600">
                Return to Setup
              </Link>
            </Card>
          ) : null}

          {!isLoading && programme ? (
            <>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">{programme.title}</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {programme.code} · {modeLabel(programme.structure_mode)} · {programme.display_stage_range}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      programme.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {programme.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Installation controls decide which programmes are enabled. Offering controls below decide which subjects this
                  organization actually teaches.
                </p>
                {programmeDisabled ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Enable this programme in setup before adding or reactivating subject offerings.
                  </div>
                ) : null}
              </Card>

              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">Available Catalogue Subjects</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Choose a catalogue subject to add as an organization offering under this programme.
                    </p>
                  </div>
                </div>

                {availableSubjects.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-5">
                    <h3 className="font-medium text-gray-900">No catalogue subjects available</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      This programme does not yet have any subject profiles in the global Cambridge catalogue.
                    </p>
                    <Link
                      href={`/cambridge/authoring/programmes/${programme.programme_id}/subjects`}
                      className="mt-4 inline-flex items-center rounded-lg border border-blue-200 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                    >
                      Open Global Authoring
                    </Link>
                  </div>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {availableSubjects.map((subject) => {
                      const alreadyOffered = subject.offered_subject_id !== null;
                      const availableVersionCount =
                        subject.structure_mode === 'QUALIFICATION' ? subject.syllabuses.length : subject.frameworks.length;
                      return (
                        <li key={subject.id} className="rounded-lg border border-gray-200 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{subject.title}</p>
                              <p className="text-sm text-gray-600">
                                {subject.subject_code} · {modeLabel(subject.structure_mode)}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {availableVersionCount} available {subject.structure_mode === 'QUALIFICATION' ? 'syllabus version(s)' : 'framework version(s)'}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {alreadyOffered ? (
                                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                                  Offered
                                </span>
                              ) : null}
                              {isAdmin ? (
                                <Button
                                  size="sm"
                                  disabled={alreadyOffered || programmeDisabled || availableVersionCount === 0}
                                  onClick={() => setCreateSubject(subject)}
                                >
                                  {alreadyOffered ? 'Already Offered' : 'Add Subject'}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">Offered Subjects</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Manage the active framework or syllabus version here, then continue to cohort assignment.
                    </p>
                  </div>
                  <Link href="/cambridge/subjects" className="text-sm text-blue-600 hover:text-blue-700">
                    Open Subject Assignments
                  </Link>
                </div>

                {offeredSubjects.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-5">
                    <h3 className="font-medium text-gray-900">No offered subjects yet</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Start by choosing a catalogue subject above. Once added, it can be assigned to cohorts.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {offeredSubjects.map((offering) => {
                      const assignments = assignmentsByOffering.get(offering.id) ?? [];
                      const activeVersion =
                        offering.structure_mode === 'QUALIFICATION' ? offering.active_syllabus : offering.active_framework;
                      const togglePending = updateOfferingMutation.isPending && updateOfferingMutation.variables?.id === offering.id;
                      return (
                        <li key={offering.id} className="rounded-lg border border-gray-200 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{offering.subject_title}</p>
                              <p className="text-sm text-gray-600">
                                {offering.subject_code} · {modeLabel(offering.structure_mode)}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">{versionLabel(activeVersion)}</p>
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
                                <Button size="sm" variant="secondary" onClick={() => setEditOffering(offering)}>
                                  {offering.structure_mode === 'QUALIFICATION' ? 'Change Syllabus' : 'Change Framework'}
                                </Button>
                              ) : null}
                              <Link
                                href={`/cambridge/offerings/${offering.id}/cohorts`}
                                className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                              >
                                Manage Cohorts
                              </Link>
                              {isAdmin ? (
                                <Button
                                  size="sm"
                                  variant={offering.is_active ? 'danger' : 'primary'}
                                  disabled={togglePending || (programmeDisabled && !offering.is_active)}
                                  onClick={() => {
                                    runAction(async () => {
                                      await updateOfferingMutation.mutateAsync({
                                        id: offering.id,
                                        payload: { is_active: !offering.is_active },
                                      });
                                    });
                                  }}
                                >
                                  {togglePending ? 'Saving...' : offering.is_active ? 'Deactivate' : 'Activate'}
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 rounded-lg bg-gray-50 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Assigned Cohorts</p>
                            {assignments.length === 0 ? (
                              <p className="mt-2 text-sm text-gray-600">
                                This offering is not assigned to any cohort yet.
                              </p>
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
                )}
              </Card>
            </>
          ) : null}

          <CambridgeFormModal
            isOpen={Boolean(createSubject)}
            onClose={() => {
              setCreateSubject(null);
              setActionError(null);
            }}
            title="Add Cambridge Subject"
            description="Create an organization-level subject offering from the selected catalogue subject."
            submitLabel="Add Subject"
            submitting={createOfferingMutation.isPending}
            errorMessage={actionError}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (!createSubject || !programmeId) return;
              const versionId = toPositiveNumber(selectedVersionId);
              runAction(async () => {
                await createOfferingMutation.mutateAsync({
                  subject_profile: createSubject.id,
                  active_framework: createSubject.structure_mode === 'QUALIFICATION' ? undefined : versionId,
                  active_syllabus: createSubject.structure_mode === 'QUALIFICATION' ? versionId : undefined,
                });
                setCreateSubject(null);
              });
            }}
          >
            {createSubject ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-900">{createSubject.title}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {createSubject.subject_code} · {modeLabel(createSubject.structure_mode)}
                  </p>
                </div>
                <Select
                  label={createSubject.structure_mode === 'QUALIFICATION' ? 'Active Syllabus' : 'Active Framework'}
                  value={selectedVersionId}
                  onChange={(event) => setSelectedVersionId(event.target.value)}
                  options={[
                    { value: '', label: createSubject.structure_mode === 'QUALIFICATION' ? 'Select syllabus' : 'Select framework' },
                    ...(createSubject.structure_mode === 'QUALIFICATION'
                      ? createSubject.syllabuses.map((syllabus) => ({
                          value: syllabus.id,
                          label: versionLabel(syllabus),
                        }))
                      : createSubject.frameworks.map((framework) => ({
                          value: framework.id,
                          label: versionLabel(framework),
                        }))),
                  ]}
                />
              </div>
            ) : null}
          </CambridgeFormModal>

          <CambridgeFormModal
            isOpen={Boolean(editOffering)}
            onClose={() => {
              setEditOffering(null);
              setActionError(null);
            }}
            title={editOffering?.structure_mode === 'QUALIFICATION' ? 'Change Active Syllabus' : 'Change Active Framework'}
            description="Update the active version used by this organization for the selected subject."
            submitLabel="Save Version"
            submitting={updateOfferingMutation.isPending}
            errorMessage={actionError}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (!editOffering) return;
              const versionId = toPositiveNumber(selectedVersionId);
              runAction(async () => {
                await updateOfferingMutation.mutateAsync({
                  id: editOffering.id,
                  payload: editOffering.structure_mode === 'QUALIFICATION'
                    ? { active_syllabus: versionId }
                    : { active_framework: versionId },
                });
                setEditOffering(null);
              });
            }}
          >
            {editOffering ? (
              <Select
                label={editOffering.structure_mode === 'QUALIFICATION' ? 'Active Syllabus' : 'Active Framework'}
                value={selectedVersionId}
                onChange={(event) => setSelectedVersionId(event.target.value)}
                options={[
                  { value: '', label: editOffering.structure_mode === 'QUALIFICATION' ? 'Select syllabus' : 'Select framework' },
                  ...((availableSubjects.find((subject) => subject.id === editOffering.subject_profile_id)?.[editOffering.structure_mode === 'QUALIFICATION' ? 'syllabuses' : 'frameworks'] ?? []).map((version) => ({
                    value: version.id,
                    label: versionLabel(version as CambridgeFrameworkVersionSummary | CambridgeSyllabusVersionSummary),
                  }))),
                ]}
              />
            ) : null}
          </CambridgeFormModal>

        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
