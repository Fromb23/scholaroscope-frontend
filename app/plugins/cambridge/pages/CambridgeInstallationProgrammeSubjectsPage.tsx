'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
  useCambridgeProgrammes,
  useCambridgeSubjects,
  useDisableCambridgeSubject,
  useEnableCambridgeSubject,
  useRenameCambridgeSubject,
} from '../hooks';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { modeLabel, toPositiveNumber } from './authoringUtils';
import { RenameSubjectModal } from '../components/RenameSubjectModal';
import type { CambridgeInstallationSubject } from '../types';

export default function CambridgeInstallationProgrammeSubjectsPage() {
  const params = useParams<{ programmeId: string }>();
  const programmeId = toPositiveNumber(params.programmeId);

  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';
  const [errorVisible, setErrorVisible] = useState(true);
  const [renameOpen, setRenameOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<CambridgeInstallationSubject | null>(null);

  const { data: installationProgrammes = [], isLoading: programmesLoading, error: programmesError } = useCambridgeProgrammes();
  const { data: subjects = [], isLoading: subjectsLoading, error: subjectsError } = useCambridgeSubjects();
  const enableSubjectMutation = useEnableCambridgeSubject();
  const disableSubjectMutation = useDisableCambridgeSubject();
  const renameSubjectMutation = useRenameCambridgeSubject();

  const selectedProgramme = useMemo(
    () => installationProgrammes.find((programme) => programme.id === programmeId) ?? null,
    [installationProgrammes, programmeId]
  );

  const programmeSubjects = useMemo(() => {
    if (!selectedProgramme) return [];
    return subjects.filter((subject) => subject.programme_code === selectedProgramme.code);
  }, [selectedProgramme, subjects]);

  const loading = programmesLoading || subjectsLoading;
  const hasError = programmesError || subjectsError;

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        <div className="space-y-6">
          <CambridgeWorkflowNav />
          <CambridgeBreadcrumb
            segments={[
              { label: 'Cambridge', href: '/cambridge' },
              { label: 'Setup', href: '/cambridge/setup' },
              { label: selectedProgramme?.title ?? 'Programme' },
              { label: 'Subjects' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Programme Subjects</h1>
              <p className="mt-1 text-sm text-gray-500">
                Installation-scoped subjects under the selected programme.
              </p>
            </div>
            <Link href="/cambridge/setup" className="text-sm text-blue-600 hover:text-blue-700">
              Back to Setup
            </Link>
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading programme subjects..." /> : null}

          {hasError && errorVisible ? (
            <ErrorBanner message="Failed to load programme subjects." onDismiss={() => setErrorVisible(false)} />
          ) : null}

          {!loading && !selectedProgramme ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Programme not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Select a programme from setup to continue with subject management.
              </p>
              <Link href="/cambridge/setup" className="mt-3 inline-block text-sm text-blue-600">
                Go to Setup
              </Link>
            </Card>
          ) : null}

          {!loading && selectedProgramme ? (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedProgramme.title}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {selectedProgramme.code} · {modeLabel(selectedProgramme.structure_mode)} ·{' '}
                    {selectedProgramme.display_stage_range}
                  </p>
                </div>
                {isAdmin ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-medium">Subject projection API missing</p>
                    <p className="mt-1 max-w-md text-amber-800">
                      This programme cannot add or project a subject from the frontend yet because the backend exposes no
                      installation-scoped create or projection endpoint for Cambridge subjects.
                    </p>
                    <Button className="mt-3" disabled>
                      Project Subject from Catalogue
                    </Button>
                  </div>
                ) : null}
              </div>

              {programmeSubjects.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-5">
                  <h3 className="font-medium text-gray-900">No projected subjects</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    No installation subjects are currently available under this programme.
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Missing backend API: there is no installation-scoped Cambridge endpoint to create or project a
                    subject into this programme from the setup workflow.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button disabled>Project Subject from Catalogue</Button>
                    <Link
                      href={`/cambridge/authoring/programmes/${selectedProgramme.id}/subjects`}
                      className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Review Global Subject Profiles
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {programmeSubjects.map((subject) => {
                    const isToggleLoading =
                      enableSubjectMutation.variables === subject.id ||
                      disableSubjectMutation.variables === subject.id;
                    const nextHref =
                      subject.structure_mode === 'QUALIFICATION'
                        ? `/cambridge/subjects/${subject.id}/syllabuses`
                        : `/cambridge/subjects/${subject.id}/frameworks`;
                    const nextLabel =
                      subject.structure_mode === 'QUALIFICATION' ? 'Manage Syllabus' : 'Manage Frameworks';
                    return (
                      <li key={subject.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{subject.display_name}</p>
                            <p className="text-sm text-gray-600">
                              {subject.subject_code ?? 'No code'} · {subject.structure_mode ?? 'Unknown structure'}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Source: {subject.subject_name}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                subject.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {subject.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            {isAdmin ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedSubject(subject);
                                  setRenameOpen(true);
                                }}
                              >
                                Rename
                              </Button>
                            ) : null}
                            {isAdmin ? (
                              <Button
                                size="sm"
                                variant={subject.enabled ? 'danger' : 'primary'}
                                disabled={isToggleLoading}
                                onClick={() => {
                                  if (subject.enabled) {
                                    disableSubjectMutation.mutate(subject.id);
                                  } else {
                                    enableSubjectMutation.mutate(subject.id);
                                  }
                                }}
                              >
                                {isToggleLoading ? 'Saving...' : subject.enabled ? 'Disable' : 'Enable'}
                              </Button>
                            ) : null}
                            <Link
                              href={nextHref}
                              className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                            >
                              {nextLabel}
                            </Link>
                            <Link
                              href={`/cambridge/subjects/${subject.id}`}
                              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              View Subject
                            </Link>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          ) : null}

          <RenameSubjectModal
            subject={selectedSubject}
            isOpen={renameOpen}
            isLoading={renameSubjectMutation.isPending}
            onClose={() => {
              setRenameOpen(false);
              setSelectedSubject(null);
            }}
            onConfirm={(payload) => {
              if (!selectedSubject || !isAdmin) return;
              renameSubjectMutation.mutate(
                { id: selectedSubject.id, payload },
                {
                  onSuccess: () => {
                    setRenameOpen(false);
                    setSelectedSubject(null);
                  },
                }
              );
            }}
          />
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
