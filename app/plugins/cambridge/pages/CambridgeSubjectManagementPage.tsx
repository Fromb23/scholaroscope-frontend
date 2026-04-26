// ============================================================================
// app/plugins/cambridge/pages/CambridgeSubjectManagementPage.tsx
// ============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useAuth } from '@/app/context/AuthContext';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
  useCambridgeInstallationStatus,
  useCambridgeSubjects,
  useDisableCambridgeSubject,
  useEnableCambridgeSubject,
  useRenameCambridgeSubject,
} from '../hooks';
import { SubjectTable } from '../components/SubjectTable';
import { RenameSubjectModal } from '../components/RenameSubjectModal';
import type { CambridgeInstallationSubject } from '../types';

export default function CambridgeSubjectManagementPage() {
  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';
  const router = useRouter();

  const {
    data: installation,
    isLoading: installationLoading,
    error: installationError,
  } = useCambridgeInstallationStatus();
  const {
    data: subjects = [],
    isLoading: subjectsLoading,
    error: subjectsError,
  } = useCambridgeSubjects();

  const enableSubjectMutation = useEnableCambridgeSubject();
  const disableSubjectMutation = useDisableCambridgeSubject();
  const renameSubjectMutation = useRenameCambridgeSubject();

  const [renameOpen, setRenameOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<CambridgeInstallationSubject | null>(null);
  const [errorVisible, setErrorVisible] = useState(true);

  const loading = installationLoading || subjectsLoading;
  const toggleLoadingId =
    typeof enableSubjectMutation.variables === 'number'
      ? enableSubjectMutation.variables
      : typeof disableSubjectMutation.variables === 'number'
        ? disableSubjectMutation.variables
        : null;

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Cambridge Subject Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              View installation subjects and apply admin-only enable/disable/rename actions.
            </p>
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading Cambridge subjects..." /> : null}

          {(installationError || subjectsError) && errorVisible ? (
            <ErrorBanner
              message="Failed to load Cambridge subjects."
              onDismiss={() => setErrorVisible(false)}
            />
          ) : null}

          {!loading && !installation ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Cambridge not installed</h2>
              <p className="text-sm text-gray-600 mt-2">
                Subject management becomes available after installation.
              </p>
            </Card>
          ) : null}

          {!loading && installation && !installation.enabled ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Installation disabled</h2>
              <p className="text-sm text-gray-600 mt-2">
                Subject reads are available, but instructional usage is blocked while disabled.
              </p>
            </Card>
          ) : null}

          {!loading && installation ? (
            <Card>
              {!isAdmin ? (
                <p className="text-sm text-gray-600 mb-3">
                  You have read-only access. Subject mutation actions require admin or superadmin role.
                </p>
              ) : null}
              {subjects.length === 0 ? (
                <p className="text-sm text-gray-600">No installation subjects found.</p>
              ) : (
                <SubjectTable
                  subjects={subjects}
                  isAdmin={isAdmin}
                  loadingSubjectId={toggleLoadingId}
                  onView={(subject) => router.push(`/cambridge/subjects/${subject.id}`)}
                  onRename={(subject) => {
                    if (!isAdmin) return;
                    setSelectedSubject(subject);
                    setRenameOpen(true);
                  }}
                  onToggle={(subject) => {
                    if (!isAdmin) return;
                    if (subject.enabled) {
                      disableSubjectMutation.mutate(subject.id);
                    } else {
                      enableSubjectMutation.mutate(subject.id);
                    }
                  }}
                />
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
