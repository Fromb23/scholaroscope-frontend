'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
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
  useCatalogueProgrammes,
  useCreateCatalogueProgramme,
  useDeleteCatalogueProgramme,
  useUpdateCatalogueProgramme,
} from '../hooks';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { modeLabel, mutationErrorMessage, nextSortOrder, toPositiveNumber } from './authoringUtils';

const PROGRAMME_CODES = [
  { value: 'CAM_PRIMARY', label: 'Cambridge Primary' },
  { value: 'CAM_LOWER_SEC', label: 'Cambridge Lower Secondary' },
  { value: 'CAM_UPPER_SEC', label: 'Cambridge IGCSE' },
  { value: 'CAM_ADVANCED', label: 'Cambridge Advanced' },
];

export default function CambridgeAuthoringProgrammesPage() {
  const { activeRole } = useAuth();
  const isAdmin = activeRole === 'ADMIN';
  const [errorVisible, setErrorVisible] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: 'CAM_PRIMARY',
    title: '',
    structure_mode: 'FRAMEWORK',
    display_stage_range: '1-6',
    active: true,
    sort_order: '',
  });

  const { data: programmes = [], isLoading, error } = useCatalogueProgrammes();
  const createMutation = useCreateCatalogueProgramme();
  const updateMutation = useUpdateCatalogueProgramme();
  const deleteMutation = useDeleteCatalogueProgramme();

  const suggestedSortOrder = useMemo(() => nextSortOrder(programmes), [programmes]);

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
              { label: 'Programmes' },
            ]}
          />

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Catalogue Programmes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Step 1: choose a global catalogue programme, then move to subject profile authoring.
            </p>
          </div>

          {isLoading ? <LoadingSpinner fullScreen={false} message="Loading programme catalogue..." /> : null}
          {error && errorVisible ? (
            <ErrorBanner message="Failed to load catalogue programmes." onDismiss={() => setErrorVisible(false)} />
          ) : null}
          {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} /> : null}

          {!isAdmin ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Read-only access</h2>
              <p className="mt-2 text-sm text-gray-600">
                Programme create/edit/delete actions require workspace administrator access.
              </p>
            </Card>
          ) : null}

          <Card>
            <h2 className="font-semibold text-gray-900">Programme List</h2>
            {programmes.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4">
                <p className="text-sm text-gray-600">No global catalogue programmes found.</p>
                <p className="mt-1 text-sm text-gray-500">Next action: create a programme to begin authoring.</p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {programmes.map((programme) => (
                  <li key={programme.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{programme.title}</p>
                        <p className="text-sm text-gray-600">
                          {programme.code} · {modeLabel(programme.structure_mode)} · {programme.display_stage_range}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Sort {programme.sort_order} · {programme.active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/cambridge/authoring/programmes/${programme.id}/subjects`}
                          className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                        >
                          Manage Subjects
                        </Link>
                        {isAdmin ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updateMutation.isPending}
                              onClick={() => {
                                const title = window.prompt('Programme title', programme.title);
                                if (!title) return;
                                runAction(async () => {
                                  await updateMutation.mutateAsync({
                                    id: programme.id,
                                    payload: { title: title.trim() },
                                  });
                                });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (!window.confirm(`Delete programme "${programme.title}"?`)) return;
                                runAction(async () => {
                                  await deleteMutation.mutateAsync(programme.id);
                                });
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

          {isAdmin ? (
            <Card>
              <details>
                <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
                  Create Programme
                </summary>
                <form
                  className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    runAction(async () => {
                      await createMutation.mutateAsync({
                        code: form.code,
                        title: form.title.trim(),
                        structure_mode: form.structure_mode,
                        display_stage_range: form.display_stage_range.trim(),
                        active: form.active,
                        sort_order: toPositiveNumber(form.sort_order) ?? suggestedSortOrder,
                      });
                      setForm((prev) => ({ ...prev, title: '', sort_order: '' }));
                    });
                  }}
                >
                  <Select
                    label="Programme Code"
                    value={form.code}
                    options={PROGRAMME_CODES}
                    onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                  />
                  <Input
                    label="Title"
                    value={form.title}
                    required
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  />
                  <Select
                    label="Structure Mode"
                    value={form.structure_mode}
                    options={[
                      { value: 'FRAMEWORK', label: 'Framework' },
                      { value: 'QUALIFICATION', label: 'Qualification' },
                    ]}
                    onChange={(event) => setForm((prev) => ({ ...prev, structure_mode: event.target.value }))}
                  />
                  <Input
                    label="Display Stage Range"
                    value={form.display_stage_range}
                    required
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, display_stage_range: event.target.value }))
                    }
                  />
                  <Input
                    label={`Sort Order (default ${suggestedSortOrder})`}
                    value={form.sort_order}
                    onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                  />
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                      />
                      Active
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={createMutation.isPending || !form.title.trim()}>
                      {createMutation.isPending ? 'Creating...' : 'Create Programme'}
                    </Button>
                  </div>
                </form>
              </details>
            </Card>
          ) : null}
        </div>
      </PermissionGuard>
    </TenantGuard>
  );
}
