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
  useCatalogueProgramme,
  useCatalogueSubjectProfile,
  useCatalogueFrameworks,
  useCatalogueSyllabuses,
  useCreateCatalogueFramework,
  useDeleteCatalogueFramework,
  useUpdateCatalogueFramework,
  useCreateCatalogueSyllabus,
  useDeleteCatalogueSyllabus,
  useUpdateCatalogueSyllabus,
} from '../hooks';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { modeLabel, mutationErrorMessage, toPositiveNumber } from './authoringUtils';

export default function CambridgeAuthoringSubjectFrameworksPage() {
  const params = useParams<{ subjectId: string }>();
  const subjectId = toPositiveNumber(params.subjectId);

  const { activeRole } = useAuth();
  const isAdmin = activeRole === 'ADMIN';
  const [errorVisible, setErrorVisible] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const [frameworkForm, setFrameworkForm] = useState({
    version_label: '',
    effective_from: '',
    effective_to: '',
  });
  const [syllabusForm, setSyllabusForm] = useState({
    title: '',
    version_label: '',
    valid_from_year: '',
    valid_to_year: '',
    grading_scheme_type: '',
    has_core_extended: false,
  });

  const { data: subjectProfile, isLoading: subjectLoading, error: subjectError } = useCatalogueSubjectProfile(subjectId);
  const { data: programme } = useCatalogueProgramme(subjectProfile?.programme ?? null);

  const {
    data: frameworks = [],
    isLoading: frameworksLoading,
    error: frameworksError,
  } = useCatalogueFrameworks({ subject_profile: subjectId ?? undefined });
  const {
    data: syllabuses = [],
    isLoading: syllabusesLoading,
    error: syllabusesError,
  } = useCatalogueSyllabuses({ subject_profile: subjectId ?? undefined });

  const createFrameworkMutation = useCreateCatalogueFramework();
  const updateFrameworkMutation = useUpdateCatalogueFramework();
  const deleteFrameworkMutation = useDeleteCatalogueFramework();
  const createSyllabusMutation = useCreateCatalogueSyllabus();
  const updateSyllabusMutation = useUpdateCatalogueSyllabus();
  const deleteSyllabusMutation = useDeleteCatalogueSyllabus();

  const isFrameworkMode = subjectProfile?.structure_mode === 'FRAMEWORK';
  const loading = subjectLoading || frameworksLoading || syllabusesLoading;
  const hasError = subjectError || frameworksError || syllabusesError;

  async function runAction(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(mutationErrorMessage(err));
    }
  }

  const breadcrumbProgrammeLabel = useMemo(() => {
    if (programme?.title) return programme.title;
    return 'Programme';
  }, [programme]);

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
                ? { label: breadcrumbProgrammeLabel, href: `/cambridge/authoring/programmes/${programme.id}/subjects` }
                : { label: breadcrumbProgrammeLabel },
              { label: subjectProfile?.title ?? 'Subject' },
              { label: isFrameworkMode ? 'Frameworks' : 'Syllabuses' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {isFrameworkMode ? 'Framework Authoring' : 'Syllabus Authoring'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Step 3: select a subject, then manage its {isFrameworkMode ? 'frameworks' : 'syllabuses'}.
              </p>
            </div>
            {programme?.id ? (
              <Link
                href={`/cambridge/authoring/programmes/${programme.id}/subjects`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Back to Subjects
              </Link>
            ) : null}
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading subject authoring context..." /> : null}
          {hasError && errorVisible ? (
            <ErrorBanner message="Failed to load subject authoring data." onDismiss={() => setErrorVisible(false)} />
          ) : null}
          {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} /> : null}

          {!loading && !subjectProfile ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Subject not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Select a subject profile from programme authoring first.
              </p>
            </Card>
          ) : null}

          {!loading && subjectProfile ? (
            <Card>
              <h2 className="font-semibold text-gray-900">{subjectProfile.title}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {subjectProfile.subject_code} · {modeLabel(subjectProfile.structure_mode)}
              </p>
            </Card>
          ) : null}

          {!loading && subjectProfile && isFrameworkMode ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Framework List</h2>
              {frameworks.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No frameworks found for this subject.</p>
                  <p className="mt-1 text-sm text-gray-500">Next action: create a framework.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {frameworks.map((framework) => (
                    <li key={framework.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{framework.version_label}</p>
                          <p className="text-sm text-gray-600">
                            {framework.effective_from} - {framework.effective_to ?? 'Current'}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">{framework.is_current ? 'Current' : 'Archived'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/cambridge/authoring/frameworks/${framework.id}/strands`}
                            className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                          >
                            Manage Strands
                          </Link>
                          {isAdmin ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={updateFrameworkMutation.isPending}
                                onClick={() => {
                                  const nextLabel = window.prompt('Version label', framework.version_label);
                                  if (!nextLabel) return;
                                  runAction(async () => {
                                    await updateFrameworkMutation.mutateAsync({
                                      id: framework.id,
                                      payload: { version_label: nextLabel.trim() },
                                    });
                                  });
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={deleteFrameworkMutation.isPending}
                                onClick={() => {
                                  if (!window.confirm(`Delete framework "${framework.version_label}"?`)) return;
                                  runAction(async () => {
                                    await deleteFrameworkMutation.mutateAsync(framework.id);
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

          {!loading && subjectProfile && !isFrameworkMode ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Syllabus List</h2>
              {syllabuses.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No syllabuses found for this subject.</p>
                  <p className="mt-1 text-sm text-gray-500">Next action: create a syllabus.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {syllabuses.map((syllabus) => (
                    <li key={syllabus.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{syllabus.title}</p>
                          <p className="text-sm text-gray-600">
                            {syllabus.version_label} · {syllabus.valid_from_year} - {syllabus.valid_to_year ?? 'Current'}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {syllabus.grading_scheme_type || 'No grading scheme'} ·{' '}
                            {syllabus.has_core_extended ? 'Core + Extended' : 'Single track'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/cambridge/authoring/syllabuses/${syllabus.id}/children`}
                            className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                          >
                            Manage Components
                          </Link>
                          {isAdmin ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={updateSyllabusMutation.isPending}
                                onClick={() => {
                                  const nextTitle = window.prompt('Syllabus title', syllabus.title);
                                  if (!nextTitle) return;
                                  runAction(async () => {
                                    await updateSyllabusMutation.mutateAsync({
                                      id: syllabus.id,
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
                                disabled={deleteSyllabusMutation.isPending}
                                onClick={() => {
                                  if (!window.confirm(`Delete syllabus "${syllabus.title}"?`)) return;
                                  runAction(async () => {
                                    await deleteSyllabusMutation.mutateAsync(syllabus.id);
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

          {isAdmin && subjectProfile && isFrameworkMode ? (
            <Card>
              <details>
                <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
                  Create Framework
                </summary>
                <form
                  className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    if (!subjectId) return;
                    runAction(async () => {
                      await createFrameworkMutation.mutateAsync({
                        subject_profile: subjectId,
                        version_label: frameworkForm.version_label.trim(),
                        effective_from: Number(frameworkForm.effective_from),
                        effective_to: frameworkForm.effective_to ? Number(frameworkForm.effective_to) : null,
                      });
                      setFrameworkForm({ version_label: '', effective_from: '', effective_to: '' });
                    });
                  }}
                >
                  <Input
                    label="Version Label"
                    value={frameworkForm.version_label}
                    required
                    onChange={(event) =>
                      setFrameworkForm((prev) => ({ ...prev, version_label: event.target.value }))
                    }
                  />
                  <Input
                    label="Effective From (Year)"
                    value={frameworkForm.effective_from}
                    required
                    onChange={(event) =>
                      setFrameworkForm((prev) => ({ ...prev, effective_from: event.target.value }))
                    }
                  />
                  <Input
                    label="Effective To (Year, optional)"
                    value={frameworkForm.effective_to}
                    onChange={(event) =>
                      setFrameworkForm((prev) => ({ ...prev, effective_to: event.target.value }))
                    }
                  />
                  <div className="md:col-span-3">
                    <Button
                      type="submit"
                      disabled={
                        createFrameworkMutation.isPending ||
                        !frameworkForm.version_label.trim() ||
                        !frameworkForm.effective_from.trim()
                      }
                    >
                      {createFrameworkMutation.isPending ? 'Creating...' : 'Create Framework'}
                    </Button>
                  </div>
                </form>
              </details>
            </Card>
          ) : null}

          {isAdmin && subjectProfile && !isFrameworkMode ? (
            <Card>
              <details>
                <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
                  Create Syllabus
                </summary>
                <form
                  className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    if (!subjectId) return;
                    runAction(async () => {
                      await createSyllabusMutation.mutateAsync({
                        subject_profile: subjectId,
                        title: syllabusForm.title.trim(),
                        version_label: syllabusForm.version_label.trim(),
                        valid_from_year: Number(syllabusForm.valid_from_year),
                        valid_to_year: syllabusForm.valid_to_year ? Number(syllabusForm.valid_to_year) : null,
                        grading_scheme_type: syllabusForm.grading_scheme_type.trim(),
                        has_core_extended: syllabusForm.has_core_extended,
                      });
                      setSyllabusForm({
                        title: '',
                        version_label: '',
                        valid_from_year: '',
                        valid_to_year: '',
                        grading_scheme_type: '',
                        has_core_extended: false,
                      });
                    });
                  }}
                >
                  <Input
                    label="Title"
                    value={syllabusForm.title}
                    required
                    onChange={(event) => setSyllabusForm((prev) => ({ ...prev, title: event.target.value }))}
                  />
                  <Input
                    label="Version Label"
                    value={syllabusForm.version_label}
                    required
                    onChange={(event) =>
                      setSyllabusForm((prev) => ({ ...prev, version_label: event.target.value }))
                    }
                  />
                  <Input
                    label="Valid From Year"
                    value={syllabusForm.valid_from_year}
                    required
                    onChange={(event) =>
                      setSyllabusForm((prev) => ({ ...prev, valid_from_year: event.target.value }))
                    }
                  />
                  <Input
                    label="Valid To Year (optional)"
                    value={syllabusForm.valid_to_year}
                    onChange={(event) =>
                      setSyllabusForm((prev) => ({ ...prev, valid_to_year: event.target.value }))
                    }
                  />
                  <Input
                    label="Grading Scheme Type"
                    value={syllabusForm.grading_scheme_type}
                    onChange={(event) =>
                      setSyllabusForm((prev) => ({ ...prev, grading_scheme_type: event.target.value }))
                    }
                  />
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={syllabusForm.has_core_extended}
                        onChange={(event) =>
                          setSyllabusForm((prev) => ({ ...prev, has_core_extended: event.target.checked }))
                        }
                      />
                      Core + Extended
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      type="submit"
                      disabled={
                        createSyllabusMutation.isPending ||
                        !syllabusForm.title.trim() ||
                        !syllabusForm.version_label.trim() ||
                        !syllabusForm.valid_from_year.trim()
                      }
                    >
                      {createSyllabusMutation.isPending ? 'Creating...' : 'Create Syllabus'}
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
