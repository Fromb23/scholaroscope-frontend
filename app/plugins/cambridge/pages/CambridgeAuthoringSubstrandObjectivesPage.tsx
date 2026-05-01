'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
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
  useCatalogueObjectives,
  useCatalogueProgramme,
  useCatalogueStrand,
  useCatalogueSubjectProfile,
  useCatalogueSubstrand,
  useCreateCatalogueObjective,
  useDeleteCatalogueObjective,
  useUpdateCatalogueObjective,
} from '../hooks';
import { CambridgeConfirmModal, CambridgeFormModal } from '../components/CambridgeAuthoringModals';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import type { CambridgeCatalogueLearningObjective } from '../types';
import { mutationErrorMessage, toPositiveNumber } from './authoringUtils';

export default function CambridgeAuthoringSubstrandObjectivesPage() {
  const params = useParams<{ substrandId: string }>();
  const substrandId = toPositiveNumber(params.substrandId);

  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';
  const [errorVisible, setErrorVisible] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<CambridgeCatalogueLearningObjective | null>(null);
  const [deletingObjective, setDeletingObjective] = useState<CambridgeCatalogueLearningObjective | null>(null);
  const [objectiveForm, setObjectiveForm] = useState({
    stage_number: '1',
    statement: '',
  });
  const [editStatement, setEditStatement] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: substrand, isLoading: substrandLoading, error: substrandError } = useCatalogueSubstrand(substrandId);
  const { data: strand, isLoading: strandLoading, error: strandError } = useCatalogueStrand(substrand?.strand ?? null);
  const { data: framework } = useCatalogueFramework(strand?.framework ?? null);
  const { data: subjectProfile } = useCatalogueSubjectProfile(framework?.subject_profile ?? null);
  const { data: programme } = useCatalogueProgramme(subjectProfile?.programme ?? null);
  const {
    data: objectives = [],
    isLoading: objectivesLoading,
    error: objectivesError,
  } = useCatalogueObjectives({ substrand: substrandId ?? undefined });

  const createObjectiveMutation = useCreateCatalogueObjective();
  const updateObjectiveMutation = useUpdateCatalogueObjective();
  const deleteObjectiveMutation = useDeleteCatalogueObjective();

  const loading = substrandLoading || strandLoading || objectivesLoading;
  const hasError = substrandError || strandError || objectivesError;

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
    setObjectiveForm({ stage_number: '1', statement: '' });
    setFormErrors({});
    setActionError(null);
  }

  function openEditModal(objective: CambridgeCatalogueLearningObjective) {
    setEditingObjective(objective);
    setEditStatement(objective.statement);
    setFormErrors({});
    setActionError(null);
  }

  function closeEditModal() {
    setEditingObjective(null);
    setEditStatement('');
    setFormErrors({});
    setActionError(null);
  }

  function validateCreateForm() {
    const nextErrors: Record<string, string> = {};
    if (!toPositiveNumber(objectiveForm.stage_number)) {
      nextErrors.stage_number = 'Stage number must be a positive number.';
    }
    if (!objectiveForm.statement.trim()) {
      nextErrors.statement = 'Objective statement is required.';
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateEditForm() {
    const nextErrors: Record<string, string> = {};
    if (!editStatement.trim()) {
      nextErrors.edit_statement = 'Objective statement is required.';
    }
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
              strand?.id
                ? { label: strand.name, href: `/cambridge/authoring/strands/${strand.id}/children` }
                : { label: 'Strand' },
              { label: substrand?.name ?? 'Substrand' },
              { label: 'Objectives' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Objective Authoring</h1>
              <p className="mt-1 text-sm text-gray-500">
                Step 6: select a substrand, then manage its objectives.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && substrand ? <Button onClick={() => setCreateModalOpen(true)}>Create Objective</Button> : null}
              {strand?.id ? (
                <Link
                  href={`/cambridge/authoring/strands/${strand.id}/children`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Back to Substrands
                </Link>
              ) : null}
            </div>
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading objectives..." /> : null}
          {hasError && errorVisible ? (
            <ErrorBanner message="Failed to load objective authoring data." onDismiss={() => setErrorVisible(false)} />
          ) : null}
          {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} /> : null}

          {!loading && !substrand ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Substrand not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Open a substrand from strand authoring before managing objectives.
              </p>
            </Card>
          ) : null}

          {!loading && substrand ? (
            <Card>
              <h2 className="font-semibold text-gray-900">{substrand.name}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {substrand.code} · Parent {strand?.name ?? 'Strand'}
              </p>
            </Card>
          ) : null}

          {!loading && substrand ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Objectives</h2>
              {objectives.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No objectives found for this substrand.</p>
                  <p className="mt-1 text-sm text-gray-500">Next action: create the first objective.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {objectives.map((objective) => (
                    <li key={objective.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{objective.objective_code}</p>
                          <p className="text-sm text-gray-700">{objective.statement}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Stage {objective.stage_number} · Sort {objective.sort_order}
                          </p>
                        </div>
                        {isAdmin ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updateObjectiveMutation.isPending}
                              onClick={() => openEditModal(objective)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={deleteObjectiveMutation.isPending}
                              onClick={() => {
                                setDeletingObjective(objective);
                                setActionError(null);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        ) : null}
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
            title="Create Objective"
            description="Parent context, objective code, and sort order are generated automatically."
            submitLabel="Create Objective"
            submitting={createObjectiveMutation.isPending}
            errorMessage={actionError}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (!substrandId || !validateCreateForm()) return;
              const stageNumber = toPositiveNumber(objectiveForm.stage_number);
              if (!stageNumber) return;
              runAction(async () => {
                await createObjectiveMutation.mutateAsync({
                  substrandId,
                  payload: {
                    stage_number: stageNumber,
                    statement: objectiveForm.statement.trim(),
                  },
                });
                closeCreateModal();
              });
            }}
          >
            <div className="space-y-4">
              <Input
                label="Stage Number"
                value={objectiveForm.stage_number}
                error={formErrors.stage_number}
                onChange={(event) => setObjectiveForm((prev) => ({ ...prev, stage_number: event.target.value }))}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Statement</label>
                <textarea
                  rows={4}
                  value={objectiveForm.statement}
                  onChange={(event) => setObjectiveForm((prev) => ({ ...prev, statement: event.target.value }))}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${
                    formErrors.statement
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {formErrors.statement ? <p className="mt-1 text-sm text-red-600">{formErrors.statement}</p> : null}
              </div>
            </div>
          </CambridgeFormModal>

          <CambridgeFormModal
            isOpen={Boolean(editingObjective)}
            onClose={closeEditModal}
            title="Edit Objective"
            description="Update the objective statement."
            submitLabel="Save Changes"
            submitting={updateObjectiveMutation.isPending}
            errorMessage={actionError}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (!editingObjective || !validateEditForm()) return;
              runAction(async () => {
                await updateObjectiveMutation.mutateAsync({
                  id: editingObjective.id,
                  payload: { statement: editStatement.trim() },
                });
                closeEditModal();
              });
            }}
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Statement</label>
              <textarea
                rows={4}
                value={editStatement}
                onChange={(event) => setEditStatement(event.target.value)}
                className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${
                  formErrors.edit_statement
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {formErrors.edit_statement ? (
                <p className="mt-1 text-sm text-red-600">{formErrors.edit_statement}</p>
              ) : null}
            </div>
          </CambridgeFormModal>

          <CambridgeConfirmModal
            isOpen={Boolean(deletingObjective)}
            onClose={() => {
              setDeletingObjective(null);
              setActionError(null);
            }}
            title="Delete Objective"
            message={
              deletingObjective
                ? `Delete objective "${deletingObjective.objective_code}"? This action cannot be undone.`
                : ''
            }
            confirmLabel="Delete Objective"
            confirming={deleteObjectiveMutation.isPending}
            onConfirm={() => {
              if (!deletingObjective) return;
              runAction(async () => {
                await deleteObjectiveMutation.mutateAsync(deletingObjective.id);
                setDeletingObjective(null);
                setActionError(null);
              });
            }}
          />
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
