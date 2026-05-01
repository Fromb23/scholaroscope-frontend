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
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
  useCatalogueProgramme,
  useCatalogueSubjectProfiles,
  useCreateCatalogueSubjectProfile,
  useDeleteCatalogueSubjectProfile,
  useUpdateCatalogueSubjectProfile,
} from '../hooks';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { generateSubjectCode, modeLabel, mutationErrorMessage, nextSortOrder, toPositiveNumber } from './authoringUtils';

export default function CambridgeAuthoringProgrammeSubjectsPage() {
  const params = useParams<{ programmeId: string }>();
  const programmeId = toPositiveNumber(params.programmeId);

  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';
  const [errorVisible, setErrorVisible] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [manualSubjectCode, setManualSubjectCode] = useState(false);
  const [sortOrder, setSortOrder] = useState('');
  const [active, setActive] = useState(true);

  const { data: programme, isLoading: programmeLoading, error: programmeError } = useCatalogueProgramme(programmeId);
  const {
    data: subjectProfiles = [],
    isLoading: subjectsLoading,
    error: subjectsError,
  } = useCatalogueSubjectProfiles({ programme: programmeId ?? undefined });
  const createMutation = useCreateCatalogueSubjectProfile();
  const updateMutation = useUpdateCatalogueSubjectProfile();
  const deleteMutation = useDeleteCatalogueSubjectProfile();

  const loading = programmeLoading || subjectsLoading;
  const hasError = programmeError || subjectsError;
  const suggestedSortOrder = useMemo(() => nextSortOrder(subjectProfiles), [subjectProfiles]);

  useEffect(() => {
    if (!manualSubjectCode) {
      setSubjectCode(generateSubjectCode(title));
    }
  }, [manualSubjectCode, title]);

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
              { label: programme?.title ?? 'Programme' },
              { label: 'Subjects' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Subject Profiles</h1>
              <p className="mt-1 text-sm text-gray-500">
                Step 2: author subject profiles under the selected global catalogue programme.
              </p>
            </div>
            <Link href="/cambridge/authoring/programmes" className="text-sm text-blue-600 hover:text-blue-700">
              Back to Programmes
            </Link>
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading subject profiles..." /> : null}
          {hasError && errorVisible ? (
            <ErrorBanner message="Failed to load subject profiles." onDismiss={() => setErrorVisible(false)} />
          ) : null}
          {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} /> : null}

          {!loading && !programme ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Programme not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Pick a valid catalogue programme before subject profile authoring.
              </p>
            </Card>
          ) : null}

          {!loading && programme ? (
            <Card>
              <h2 className="font-semibold text-gray-900">{programme.title}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {programme.code} · {modeLabel(programme.structure_mode)} · {programme.display_stage_range}
              </p>

              {subjectProfiles.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No subject profiles found under this programme.</p>
                  <p className="mt-1 text-sm text-gray-500">Next action: create a subject profile.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {subjectProfiles.map((subject) => (
                    <li key={subject.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{subject.title}</p>
                          <p className="text-sm text-gray-600">
                            {subject.subject_code} · Sort {subject.sort_order}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {subject.active ? 'Active' : 'Inactive'} · {modeLabel(subject.structure_mode)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/cambridge/authoring/subjects/${subject.id}/frameworks`}
                            className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                          >
                            Manage Frameworks
                          </Link>
                          {isAdmin ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={updateMutation.isPending}
                                onClick={() => {
                                  const nextTitle = window.prompt('Subject title', subject.title);
                                  if (!nextTitle) return;
                                  runAction(async () => {
                                    await updateMutation.mutateAsync({
                                      id: subject.id,
                                      payload: { title: nextTitle.trim() },
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
                                  if (!window.confirm(`Delete subject profile "${subject.title}"?`)) return;
                                  runAction(async () => {
                                    await deleteMutation.mutateAsync(subject.id);
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

          {isAdmin && programme ? (
            <Card>
              <details>
                <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
                  Create Subject
                </summary>
                <form
                  className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    if (!programmeId) return;
                    runAction(async () => {
                      await createMutation.mutateAsync({
                        title: title.trim(),
                        programme: programmeId,
                        subject_code: subjectCode.trim(),
                        sort_order: toPositiveNumber(sortOrder) ?? suggestedSortOrder,
                        active,
                      });
                      setTitle('');
                      setSubjectCode('');
                      setManualSubjectCode(false);
                      setSortOrder('');
                      setActive(true);
                    });
                  }}
                >
                  <Input label="Programme" value={programme.title} disabled />
                  <Input
                    label="Subject Title"
                    value={title}
                    required
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  <div>
                    <Input
                      label="Subject Code"
                      value={subjectCode}
                      required
                      onChange={(event) => {
                        setManualSubjectCode(true);
                        setSubjectCode(event.target.value.toUpperCase());
                      }}
                    />
                    <button
                      type="button"
                      className="mt-1 text-xs text-blue-600"
                      onClick={() => {
                        setManualSubjectCode(false);
                        setSubjectCode(generateSubjectCode(title));
                      }}
                    >
                      Auto-generate from title
                    </button>
                  </div>
                  <Input
                    label={`Sort Order (default ${suggestedSortOrder})`}
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                  />
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
                      Active
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={createMutation.isPending || !title.trim() || !subjectCode.trim()}>
                      {createMutation.isPending ? 'Creating...' : 'Create Subject'}
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
