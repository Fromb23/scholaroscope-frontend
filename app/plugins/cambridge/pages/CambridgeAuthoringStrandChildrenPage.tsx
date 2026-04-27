'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
  useCatalogueFramework,
  useCatalogueProgramme,
  useCatalogueStrand,
  useCatalogueSubjectProfile,
  useCatalogueSubstrands,
  useCreateCatalogueSubstrand,
  useDeleteCatalogueSubstrand,
  useUpdateCatalogueSubstrand,
} from '../hooks';
import { CambridgeConfirmModal, CambridgeFormModal } from '../components/CambridgeAuthoringModals';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import type { CambridgeCatalogueSubstrand } from '../types';
import { mutationErrorMessage, toPositiveNumber } from './authoringUtils';

export default function CambridgeAuthoringStrandChildrenPage() {
  const params = useParams<{ strandId: string }>();
  const strandId = toPositiveNumber(params.strandId);

  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';
  const [errorVisible, setErrorVisible] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSubstrand, setEditingSubstrand] = useState<CambridgeCatalogueSubstrand | null>(null);
  const [deletingSubstrand, setDeletingSubstrand] = useState<CambridgeCatalogueSubstrand | null>(null);
  const [substrandName, setSubstrandName] = useState('');
  const [editName, setEditName] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: strand, isLoading: strandLoading, error: strandError } = useCatalogueStrand(strandId);
  const { data: framework } = useCatalogueFramework(strand?.framework ?? null);
  const { data: subjectProfile } = useCatalogueSubjectProfile(framework?.subject_profile ?? null);
  const { data: programme } = useCatalogueProgramme(subjectProfile?.programme ?? null);
  const {
    data: substrands = [],
    isLoading: substrandsLoading,
    error: substrandsError,
  } = useCatalogueSubstrands({ strand: strandId ?? undefined });

  const createSubstrandMutation = useCreateCatalogueSubstrand();
  const updateSubstrandMutation = useUpdateCatalogueSubstrand();
  const deleteSubstrandMutation = useDeleteCatalogueSubstrand();

  const loading = strandLoading || substrandsLoading;
  const hasError = strandError || substrandsError;

  async function runAction(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(mutationErrorMessage(err));
    }
  }

  function closeCreateModal() {
    setCreateModalOpen(false);
    setSubstrandName('');
    setFormErrors({});
    setActionError(null);
  }

  function openEditModal(substrand: CambridgeCatalogueSubstrand) {
    setEditingSubstrand(substrand);
    setEditName(substrand.name);
    setFormErrors({});
    setActionError(null);
  }

  function closeEditModal() {
    setEditingSubstrand(null);
    setEditName('');
    setFormErrors({});
    setActionError(null);
  }

  function validateCreateForm() {
    const nextErrors: Record<string, string> = {};
    if (!substrandName.trim()) nextErrors.name = 'Substrand name is required.';
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateEditForm() {
    const nextErrors: Record<string, string> = {};
    if (!editName.trim()) nextErrors.edit_name = 'Substrand name is required.';
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  return (
    <TenantGuard>
      <PermissionGuard allowedRoles={['ADMIN', 'INSTRUCTOR']}>
        <div className="space-y-6">
          <CambridgeWorkflowNav />
          <CambridgeBreadcrumb
            segments={[
              { label: 'Cambridge', href: '/cambridge' },
              { label: 'Authoring', href: '/cambridge/authoring/programmes' },
              { label: 'Programmes', href: '/cambridge/authoring/programmes' },
              programme?.id
                ? { label: programme.title, href: `/cambridge/authoring/programmes/${programme.id}/subjects` }
                : { label: 'Programme' },
              subjectProfile?.id
                ? { label: subjectProfile.title, href: `/cambridge/authoring/subjects/${subjectProfile.id}/frameworks` }
                : { label: 'Subject' },
              framework?.id
                ? { label: framework.version_label, href: `/cambridge/authoring/frameworks/${framework.id}/strands` }
                : { label: 'Framework' },
              { label: strand?.name ?? 'Strand' },
              { label: 'Substrands' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Substrand Authoring</h1>
              <p className="mt-1 text-sm text-gray-500">
                Step 5: select a strand, then manage its substrands.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && strand ? <Button onClick={() => setCreateModalOpen(true)}>Create Substrand</Button> : null}
              {framework?.id ? (
                <Link
                  href={`/cambridge/authoring/frameworks/${framework.id}/strands`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Back to Strands
                </Link>
              ) : null}
            </div>
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading substrands..." /> : null}
          {hasError && errorVisible ? (
            <ErrorBanner message="Failed to load substrand authoring data." onDismiss={() => setErrorVisible(false)} />
          ) : null}
          {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} /> : null}

          {!loading && !strand ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Strand not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Select a strand from framework authoring before creating substrands.
              </p>
            </Card>
          ) : null}

          {!loading && strand ? (
            <Card>
              <h2 className="font-semibold text-gray-900">{strand.name}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {strand.code} · Sort {strand.sort_order}
              </p>
            </Card>
          ) : null}

          {!loading && strand ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Substrands</h2>
              {substrands.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No substrands found for this strand.</p>
                  <p className="mt-1 text-sm text-gray-500">Next action: create the first substrand.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {substrands.map((substrand) => (
                    <li key={substrand.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{substrand.name}</p>
                          <p className="text-sm text-gray-600">
                            {substrand.code} · Sort {substrand.sort_order}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/cambridge/authoring/substrands/${substrand.id}/objectives`}
                            className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                          >
                            Manage Objectives
                          </Link>
                          {isAdmin ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={updateSubstrandMutation.isPending}
                                onClick={() => openEditModal(substrand)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={deleteSubstrandMutation.isPending}
                                onClick={() => {
                                  setDeletingSubstrand(substrand);
                                  setActionError(null);
                                }}
                              >
                                Delete
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          <CambridgeFormModal
            isOpen={createModalOpen}
            onClose={closeCreateModal}
            title="Create Substrand"
            description="Code and sort order are generated automatically from the selected parent strand."
            submitLabel="Create Substrand"
            submitting={createSubstrandMutation.isPending}
            errorMessage={actionError}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (!strandId || !validateCreateForm()) return;
              runAction(async () => {
                await createSubstrandMutation.mutateAsync({
                  strandId,
                  payload: {
                    name: substrandName.trim(),
                  },
                });
                closeCreateModal();
              });
            }}
          >
            <Input
              label="Substrand Name"
              value={substrandName}
              error={formErrors.name}
              onChange={(event) => setSubstrandName(event.target.value)}
            />
          </CambridgeFormModal>

          <CambridgeFormModal
            isOpen={Boolean(editingSubstrand)}
            onClose={closeEditModal}
            title="Edit Substrand"
            description="Update the substrand display name."
            submitLabel="Save Changes"
            submitting={updateSubstrandMutation.isPending}
            errorMessage={actionError}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (!editingSubstrand || !validateEditForm()) return;
              runAction(async () => {
                await updateSubstrandMutation.mutateAsync({
                  id: editingSubstrand.id,
                  payload: { name: editName.trim() },
                });
                closeEditModal();
              });
            }}
          >
            <Input
              label="Substrand Name"
              value={editName}
              error={formErrors.edit_name}
              onChange={(event) => setEditName(event.target.value)}
            />
          </CambridgeFormModal>

          <CambridgeConfirmModal
            isOpen={Boolean(deletingSubstrand)}
            onClose={() => {
              setDeletingSubstrand(null);
              setActionError(null);
            }}
            title="Delete Substrand"
            message={
              deletingSubstrand
                ? `Delete substrand "${deletingSubstrand.name}"? This action cannot be undone.`
                : ''
            }
            confirmLabel="Delete Substrand"
            confirming={deleteSubstrandMutation.isPending}
            onConfirm={() => {
              if (!deletingSubstrand) return;
              runAction(async () => {
                await deleteSubstrandMutation.mutateAsync(deletingSubstrand.id);
                setDeletingSubstrand(null);
                setActionError(null);
              });
            }}
          />
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
