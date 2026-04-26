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
import {
  useCatalogueFramework,
  useCatalogueProgramme,
  useCatalogueStrands,
  useCatalogueSubjectProfile,
  useCreateCatalogueStrand,
  useDeleteCatalogueStrand,
  useUpdateCatalogueStrand,
} from '../hooks';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { mutationErrorMessage, nextSortOrder, toPositiveNumber } from './authoringUtils';

export default function CambridgeAuthoringFrameworkStrandsPage() {
  const params = useParams<{ frameworkId: string }>();
  const frameworkId = toPositiveNumber(params.frameworkId);

  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';
  const [errorVisible, setErrorVisible] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    sort_order: '',
  });

  const { data: framework, isLoading: frameworkLoading, error: frameworkError } = useCatalogueFramework(frameworkId);
  const { data: subjectProfile } = useCatalogueSubjectProfile(framework?.subject_profile ?? null);
  const { data: programme } = useCatalogueProgramme(subjectProfile?.programme ?? null);
  const { data: strands = [], isLoading: strandsLoading, error: strandsError } = useCatalogueStrands({
    framework: frameworkId ?? undefined,
  });
  const createMutation = useCreateCatalogueStrand();
  const updateMutation = useUpdateCatalogueStrand();
  const deleteMutation = useDeleteCatalogueStrand();

  const loading = frameworkLoading || strandsLoading;
  const hasError = frameworkError || strandsError;
  const suggestedSortOrder = useMemo(() => nextSortOrder(strands), [strands]);

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
              { label: framework?.version_label ?? 'Framework' },
              { label: 'Strands' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Framework Strands</h1>
              <p className="mt-1 text-sm text-gray-500">
                Step 4: select a framework, then author its strands.
              </p>
            </div>
            {subjectProfile?.id ? (
              <Link
                href={`/cambridge/authoring/subjects/${subjectProfile.id}/frameworks`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Back to Frameworks
              </Link>
            ) : null}
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading framework strands..." /> : null}
          {hasError && errorVisible ? (
            <ErrorBanner message="Failed to load framework strands." onDismiss={() => setErrorVisible(false)} />
          ) : null}
          {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} /> : null}

          {!loading && !framework ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Framework not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Open a framework from subject authoring before managing strands.
              </p>
            </Card>
          ) : null}

          {!loading && framework ? (
            <Card>
              <h2 className="font-semibold text-gray-900">{framework.version_label}</h2>
              <p className="mt-1 text-sm text-gray-600">
                Effective {framework.effective_from} - {framework.effective_to ?? 'Current'}
              </p>

              {strands.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No strands found under this framework.</p>
                  <p className="mt-1 text-sm text-gray-500">Next action: create a strand.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {strands.map((strand) => (
                    <li key={strand.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{strand.name}</p>
                          <p className="text-sm text-gray-600">
                            {strand.code} · Sort {strand.sort_order}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/cambridge/authoring/strands/${strand.id}/children`}
                            className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                          >
                            Manage Children
                          </Link>
                          {isAdmin ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={updateMutation.isPending}
                                onClick={() => {
                                  const nextName = window.prompt('Strand name', strand.name);
                                  if (!nextName) return;
                                  runAction(async () => {
                                    await updateMutation.mutateAsync({
                                      id: strand.id,
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
                                disabled={deleteMutation.isPending}
                                onClick={() => {
                                  if (!window.confirm(`Delete strand "${strand.name}"?`)) return;
                                  runAction(async () => {
                                    await deleteMutation.mutateAsync(strand.id);
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
          ) : null}

          {isAdmin && framework ? (
            <Card>
              <details>
                <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
                  Create Strand
                </summary>
                <form
                  className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    if (!frameworkId) return;
                    runAction(async () => {
                      await createMutation.mutateAsync({
                        framework: frameworkId,
                        code: form.code.trim(),
                        name: form.name.trim(),
                        sort_order: toPositiveNumber(form.sort_order) ?? suggestedSortOrder,
                      });
                      setForm({ code: '', name: '', sort_order: '' });
                    });
                  }}
                >
                  <Input
                    label="Strand Code"
                    value={form.code}
                    required
                    onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                  />
                  <Input
                    label="Strand Name"
                    value={form.name}
                    required
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <Input
                    label={`Sort Order (default ${suggestedSortOrder})`}
                    value={form.sort_order}
                    onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                  />
                  <div className="md:col-span-3">
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || !form.code.trim() || !form.name.trim()}
                    >
                      {createMutation.isPending ? 'Creating...' : 'Create Strand'}
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
