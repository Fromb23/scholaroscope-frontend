'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { PermissionGuard } from '@/app/core/guards/PermissionGuard';
import { TenantGuard } from '@/app/core/guards/TenantGuard';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import {
  useCatalogueFramework,
  useCatalogueObjectives,
  useCatalogueProgramme,
  useCatalogueStrand,
  useCatalogueSubjectProfile,
  useCatalogueSubstrands,
  useCreateCatalogueObjective,
  useCreateCatalogueSubstrand,
  useDeleteCatalogueObjective,
  useDeleteCatalogueSubstrand,
  useUpdateCatalogueObjective,
  useUpdateCatalogueSubstrand,
} from '../hooks';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { mutationErrorMessage, nextSortOrder, toPositiveNumber } from './authoringUtils';

export default function CambridgeAuthoringStrandChildrenPage() {
  const params = useParams<{ strandId: string }>();
  const strandId = toPositiveNumber(params.strandId);

  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';
  const [errorVisible, setErrorVisible] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [substrandForm, setSubstrandForm] = useState({
    code: '',
    name: '',
    sort_order: '',
  });
  const [objectiveForm, setObjectiveForm] = useState({
    substrand: '',
    stage_number: '1',
    objective_code: '',
    statement: '',
    sort_order: '',
  });

  const { data: strand, isLoading: strandLoading, error: strandError } = useCatalogueStrand(strandId);
  const { data: framework } = useCatalogueFramework(strand?.framework ?? null);
  const { data: subjectProfile } = useCatalogueSubjectProfile(framework?.subject_profile ?? null);
  const { data: programme } = useCatalogueProgramme(subjectProfile?.programme ?? null);

  const {
    data: substrands = [],
    isLoading: substrandsLoading,
    error: substrandsError,
  } = useCatalogueSubstrands({ strand: strandId ?? undefined });
  const {
    data: objectives = [],
    isLoading: objectivesLoading,
    error: objectivesError,
  } = useCatalogueObjectives({ strand: strandId ?? undefined });

  const createSubstrandMutation = useCreateCatalogueSubstrand();
  const updateSubstrandMutation = useUpdateCatalogueSubstrand();
  const deleteSubstrandMutation = useDeleteCatalogueSubstrand();
  const createObjectiveMutation = useCreateCatalogueObjective();
  const updateObjectiveMutation = useUpdateCatalogueObjective();
  const deleteObjectiveMutation = useDeleteCatalogueObjective();

  const loading = strandLoading || substrandsLoading || objectivesLoading;
  const hasError = strandError || substrandsError || objectivesError;

  const suggestedSubstrandSort = useMemo(() => nextSortOrder(substrands), [substrands]);
  const suggestedObjectiveSort = useMemo(() => nextSortOrder(objectives), [objectives]);

  async function runAction(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(mutationErrorMessage(err));
    }
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
              { label: 'Children' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Strand Children</h1>
              <p className="mt-1 text-sm text-gray-500">
                Step 5: author substrands and objectives under the selected strand.
              </p>
            </div>
            {framework?.id ? (
              <Link
                href={`/cambridge/authoring/frameworks/${framework.id}/strands`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Back to Strands
              </Link>
            ) : null}
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading strand children..." /> : null}
          {hasError && errorVisible ? (
            <ErrorBanner message="Failed to load strand child authoring data." onDismiss={() => setErrorVisible(false)} />
          ) : null}
          {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} /> : null}

          {!loading && !strand ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Strand not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Select a strand from framework authoring before creating child nodes.
              </p>
            </Card>
          ) : null}

          {!loading && strand ? (
            <Card>
              <h2 className="font-semibold text-gray-900">{strand.name}</h2>
              <p className="mt-1 text-sm text-gray-600">{strand.code}</p>
            </Card>
          ) : null}

          {!loading && strand ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Substrands</h2>
              {substrands.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No substrands found.</p>
                  <p className="mt-1 text-sm text-gray-500">Next action: create a substrand.</p>
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
                        {isAdmin ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updateSubstrandMutation.isPending}
                              onClick={() => {
                                const nextName = window.prompt('Substrand name', substrand.name);
                                if (!nextName) return;
                                runAction(async () => {
                                  await updateSubstrandMutation.mutateAsync({
                                    id: substrand.id,
                                    payload: { name: nextName.trim() },
                                  });
                                });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={deleteSubstrandMutation.isPending}
                              onClick={() => {
                                if (!window.confirm(`Delete substrand "${substrand.name}"?`)) return;
                                runAction(async () => {
                                  await deleteSubstrandMutation.mutateAsync(substrand.id);
                                });
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

          {isAdmin && strand ? (
            <Card>
              <details>
                <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
                  Create Substrand
                </summary>
                <form
                  className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    if (!strandId) return;
                    runAction(async () => {
                      await createSubstrandMutation.mutateAsync({
                        strand: strandId,
                        code: substrandForm.code.trim(),
                        name: substrandForm.name.trim(),
                        sort_order: toPositiveNumber(substrandForm.sort_order) ?? suggestedSubstrandSort,
                      });
                      setSubstrandForm({ code: '', name: '', sort_order: '' });
                    });
                  }}
                >
                  <Input
                    label="Substrand Code"
                    value={substrandForm.code}
                    required
                    onChange={(event) =>
                      setSubstrandForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                    }
                  />
                  <Input
                    label="Substrand Name"
                    value={substrandForm.name}
                    required
                    onChange={(event) => setSubstrandForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <Input
                    label={`Sort Order (default ${suggestedSubstrandSort})`}
                    value={substrandForm.sort_order}
                    onChange={(event) => setSubstrandForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                  />
                  <div className="md:col-span-3">
                    <Button
                      type="submit"
                      disabled={
                        createSubstrandMutation.isPending ||
                        !substrandForm.code.trim() ||
                        !substrandForm.name.trim()
                      }
                    >
                      {createSubstrandMutation.isPending ? 'Creating...' : 'Create Substrand'}
                    </Button>
                  </div>
                </form>
              </details>
            </Card>
          ) : null}

          {!loading && strand ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Objectives</h2>
              {objectives.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No objectives found under this strand.</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Next action: create an objective after selecting a substrand.
                  </p>
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
                              onClick={() => {
                                const nextStatement = window.prompt('Objective statement', objective.statement);
                                if (!nextStatement) return;
                                runAction(async () => {
                                  await updateObjectiveMutation.mutateAsync({
                                    id: objective.id,
                                    payload: { statement: nextStatement.trim() },
                                  });
                                });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={deleteObjectiveMutation.isPending}
                              onClick={() => {
                                if (!window.confirm(`Delete objective "${objective.objective_code}"?`)) return;
                                runAction(async () => {
                                  await deleteObjectiveMutation.mutateAsync(objective.id);
                                });
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

          {isAdmin && strand ? (
            <Card>
              <details>
                <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
                  Create Objective
                </summary>
                {substrands.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-600">
                    Create a substrand first. Objectives must be linked to a parent substrand.
                  </p>
                ) : (
                  <form
                    className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
                    onSubmit={(event: FormEvent) => {
                      event.preventDefault();
                      if (!strandId) return;
                      const substrandId = toPositiveNumber(objectiveForm.substrand);
                      if (!substrandId) {
                        setActionError('Select a substrand before creating an objective.');
                        return;
                      }
                      runAction(async () => {
                        await createObjectiveMutation.mutateAsync({
                          strand: strandId,
                          substrand: substrandId,
                          stage_number: Number(objectiveForm.stage_number),
                          objective_code: objectiveForm.objective_code.trim(),
                          statement: objectiveForm.statement.trim(),
                          sort_order: toPositiveNumber(objectiveForm.sort_order) ?? suggestedObjectiveSort,
                        });
                        setObjectiveForm({
                          substrand: '',
                          stage_number: '1',
                          objective_code: '',
                          statement: '',
                          sort_order: '',
                        });
                      });
                    }}
                  >
                    <Select
                      label="Substrand"
                      value={objectiveForm.substrand}
                      options={[
                        { value: '', label: 'Select substrand' },
                        ...substrands.map((substrand) => ({
                          value: substrand.id,
                          label: `${substrand.code} · ${substrand.name}`,
                        })),
                      ]}
                      onChange={(event) => setObjectiveForm((prev) => ({ ...prev, substrand: event.target.value }))}
                    />
                    <Input
                      label="Stage Number"
                      value={objectiveForm.stage_number}
                      required
                      onChange={(event) => setObjectiveForm((prev) => ({ ...prev, stage_number: event.target.value }))}
                    />
                    <Input
                      label="Objective Code"
                      value={objectiveForm.objective_code}
                      required
                      onChange={(event) =>
                        setObjectiveForm((prev) => ({ ...prev, objective_code: event.target.value.toUpperCase() }))
                      }
                    />
                    <Input
                      label="Statement"
                      value={objectiveForm.statement}
                      required
                      onChange={(event) => setObjectiveForm((prev) => ({ ...prev, statement: event.target.value }))}
                    />
                    <Input
                      label={`Sort Order (default ${suggestedObjectiveSort})`}
                      value={objectiveForm.sort_order}
                      onChange={(event) => setObjectiveForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                    />
                    <div className="md:col-span-2">
                      <Button
                        type="submit"
                        disabled={
                          createObjectiveMutation.isPending ||
                          !objectiveForm.substrand ||
                          !objectiveForm.stage_number.trim() ||
                          !objectiveForm.objective_code.trim() ||
                          !objectiveForm.statement.trim()
                        }
                      >
                        {createObjectiveMutation.isPending ? 'Creating...' : 'Create Objective'}
                      </Button>
                    </div>
                  </form>
                )}
              </details>
            </Card>
          ) : null}
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
