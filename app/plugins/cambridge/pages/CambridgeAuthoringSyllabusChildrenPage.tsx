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
  useCatalogueAssessmentComponents,
  useCatalogueContentAreas,
  useCatalogueEntryOptions,
  useCatalogueProgramme,
  useCatalogueSubjectProfile,
  useCatalogueSyllabus,
  useCreateCatalogueAssessmentComponent,
  useCreateCatalogueContentArea,
  useCreateCatalogueEntryOption,
  useDeleteCatalogueAssessmentComponent,
  useDeleteCatalogueContentArea,
  useDeleteCatalogueEntryOption,
  useUpdateCatalogueAssessmentComponent,
  useUpdateCatalogueContentArea,
  useUpdateCatalogueEntryOption,
} from '../hooks';
import { CambridgeBreadcrumb, CambridgeWorkflowNav } from '../components/CambridgeNavigation';
import { mutationErrorMessage, nextSortOrder, toPositiveNumber } from './authoringUtils';

export default function CambridgeAuthoringSyllabusChildrenPage() {
  const params = useParams<{ syllabusId: string }>();
  const syllabusId = toPositiveNumber(params.syllabusId);

  const { user, activeRole } = useAuth();
  const isAdmin = user?.is_superadmin || activeRole === 'ADMIN';
  const [errorVisible, setErrorVisible] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [entryOptionComponentIds, setEntryOptionComponentIds] = useState<number[]>([]);

  const [contentAreaForm, setContentAreaForm] = useState({
    code: '',
    title: '',
    tier: 'BOTH',
    sort_order: '',
  });
  const [assessmentForm, setAssessmentForm] = useState({
    component_code: '',
    name: '',
    component_type: 'WRITTEN',
    weight_percentage: '',
    max_mark: '',
    duration_minutes: '',
    is_optional: false,
  });
  const [entryOptionForm, setEntryOptionForm] = useState({
    option_code: '',
    zone_code: '',
    title: '',
  });

  const { data: syllabus, isLoading: syllabusLoading, error: syllabusError } = useCatalogueSyllabus(syllabusId);
  const { data: subjectProfile } = useCatalogueSubjectProfile(syllabus?.subject_profile ?? null);
  const { data: programme } = useCatalogueProgramme(subjectProfile?.programme ?? null);

  const { data: contentAreas = [], isLoading: contentLoading, error: contentError } = useCatalogueContentAreas({
    syllabus: syllabusId ?? undefined,
  });
  const {
    data: assessmentComponents = [],
    isLoading: assessmentLoading,
    error: assessmentError,
  } = useCatalogueAssessmentComponents({ syllabus: syllabusId ?? undefined });
  const { data: entryOptions = [], isLoading: entryLoading, error: entryError } = useCatalogueEntryOptions({
    syllabus: syllabusId ?? undefined,
  });

  const createContentAreaMutation = useCreateCatalogueContentArea();
  const updateContentAreaMutation = useUpdateCatalogueContentArea();
  const deleteContentAreaMutation = useDeleteCatalogueContentArea();
  const createAssessmentMutation = useCreateCatalogueAssessmentComponent();
  const updateAssessmentMutation = useUpdateCatalogueAssessmentComponent();
  const deleteAssessmentMutation = useDeleteCatalogueAssessmentComponent();
  const createEntryOptionMutation = useCreateCatalogueEntryOption();
  const updateEntryOptionMutation = useUpdateCatalogueEntryOption();
  const deleteEntryOptionMutation = useDeleteCatalogueEntryOption();

  const loading = syllabusLoading || contentLoading || assessmentLoading || entryLoading;
  const hasError = syllabusError || contentError || assessmentError || entryError;
  const suggestedContentSort = useMemo(() => nextSortOrder(contentAreas), [contentAreas]);

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
              { label: syllabus?.title ?? 'Syllabus' },
              { label: 'Children' },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Syllabus Children</h1>
              <p className="mt-1 text-sm text-gray-500">
                Qualification-mode child authoring for content areas, assessment components, and entry options.
              </p>
            </div>
            {subjectProfile?.id ? (
              <Link
                href={`/cambridge/authoring/subjects/${subjectProfile.id}/frameworks`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Back to Syllabuses
              </Link>
            ) : null}
          </div>

          {loading ? <LoadingSpinner fullScreen={false} message="Loading syllabus children..." /> : null}
          {hasError && errorVisible ? (
            <ErrorBanner message="Failed to load syllabus child authoring data." onDismiss={() => setErrorVisible(false)} />
          ) : null}
          {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} /> : null}

          {!loading && !syllabus ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Syllabus not found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Select a syllabus from subject authoring to manage components.
              </p>
            </Card>
          ) : null}

          {!loading && syllabus ? (
            <Card>
              <h2 className="font-semibold text-gray-900">{syllabus.title}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {syllabus.version_label} · {syllabus.valid_from_year} - {syllabus.valid_to_year ?? 'Current'}
              </p>
            </Card>
          ) : null}

          {!loading && syllabus ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Content Areas</h2>
              {contentAreas.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No content areas found.</p>
                  <p className="mt-1 text-sm text-gray-500">Next action: create a content area.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {contentAreas.map((area) => (
                    <li key={area.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{area.title}</p>
                          <p className="text-sm text-gray-600">
                            {area.code} · {area.tier} · Sort {area.sort_order}
                          </p>
                        </div>
                        {isAdmin ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updateContentAreaMutation.isPending}
                              onClick={() => {
                                const nextTitle = window.prompt('Content area title', area.title);
                                if (!nextTitle) return;
                                runAction(async () => {
                                  await updateContentAreaMutation.mutateAsync({
                                    id: area.id,
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
                              disabled={deleteContentAreaMutation.isPending}
                              onClick={() => {
                                if (!window.confirm(`Delete content area "${area.title}"?`)) return;
                                runAction(async () => {
                                  await deleteContentAreaMutation.mutateAsync(area.id);
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

          {isAdmin && syllabus ? (
            <Card>
              <details>
                <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
                  Create Content Area
                </summary>
                <form
                  className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    if (!syllabusId) return;
                    runAction(async () => {
                      await createContentAreaMutation.mutateAsync({
                        syllabus: syllabusId,
                        code: contentAreaForm.code.trim(),
                        title: contentAreaForm.title.trim(),
                        tier: contentAreaForm.tier,
                        sort_order: toPositiveNumber(contentAreaForm.sort_order) ?? suggestedContentSort,
                      });
                      setContentAreaForm({ code: '', title: '', tier: 'BOTH', sort_order: '' });
                    });
                  }}
                >
                  <Input
                    label="Code"
                    value={contentAreaForm.code}
                    required
                    onChange={(event) =>
                      setContentAreaForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                    }
                  />
                  <Input
                    label="Title"
                    value={contentAreaForm.title}
                    required
                    onChange={(event) => setContentAreaForm((prev) => ({ ...prev, title: event.target.value }))}
                  />
                  <Select
                    label="Tier"
                    value={contentAreaForm.tier}
                    options={[
                      { value: 'BOTH', label: 'Both' },
                      { value: 'CORE', label: 'Core' },
                      { value: 'EXTENDED', label: 'Extended' },
                    ]}
                    onChange={(event) => setContentAreaForm((prev) => ({ ...prev, tier: event.target.value }))}
                  />
                  <Input
                    label={`Sort Order (default ${suggestedContentSort})`}
                    value={contentAreaForm.sort_order}
                    onChange={(event) => setContentAreaForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                  />
                  <div className="md:col-span-4">
                    <Button
                      type="submit"
                      disabled={
                        createContentAreaMutation.isPending ||
                        !contentAreaForm.code.trim() ||
                        !contentAreaForm.title.trim()
                      }
                    >
                      {createContentAreaMutation.isPending ? 'Creating...' : 'Create Content Area'}
                    </Button>
                  </div>
                </form>
              </details>
            </Card>
          ) : null}

          {!loading && syllabus ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Assessment Components</h2>
              {assessmentComponents.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No assessment components found.</p>
                  <p className="mt-1 text-sm text-gray-500">Next action: create an assessment component.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {assessmentComponents.map((component) => (
                    <li key={component.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{component.name}</p>
                          <p className="text-sm text-gray-600">
                            {component.component_code} · {component.component_type}
                          </p>
                        </div>
                        {isAdmin ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updateAssessmentMutation.isPending}
                              onClick={() => {
                                const nextName = window.prompt('Component name', component.name);
                                if (!nextName) return;
                                runAction(async () => {
                                  await updateAssessmentMutation.mutateAsync({
                                    id: component.id,
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
                              disabled={deleteAssessmentMutation.isPending}
                              onClick={() => {
                                if (!window.confirm(`Delete component "${component.name}"?`)) return;
                                runAction(async () => {
                                  await deleteAssessmentMutation.mutateAsync(component.id);
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

          {isAdmin && syllabus ? (
            <Card>
              <details>
                <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
                  Create Assessment Component
                </summary>
                <form
                  className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    if (!syllabusId) return;
                    runAction(async () => {
                      await createAssessmentMutation.mutateAsync({
                        syllabus: syllabusId,
                        component_code: assessmentForm.component_code.trim(),
                        name: assessmentForm.name.trim(),
                        component_type: assessmentForm.component_type,
                        weight_percentage: assessmentForm.weight_percentage || null,
                        max_mark: assessmentForm.max_mark ? Number(assessmentForm.max_mark) : null,
                        duration_minutes: assessmentForm.duration_minutes
                          ? Number(assessmentForm.duration_minutes)
                          : null,
                        is_optional: assessmentForm.is_optional,
                      });
                      setAssessmentForm({
                        component_code: '',
                        name: '',
                        component_type: 'WRITTEN',
                        weight_percentage: '',
                        max_mark: '',
                        duration_minutes: '',
                        is_optional: false,
                      });
                    });
                  }}
                >
                  <Input
                    label="Component Code"
                    value={assessmentForm.component_code}
                    required
                    onChange={(event) =>
                      setAssessmentForm((prev) => ({ ...prev, component_code: event.target.value.toUpperCase() }))
                    }
                  />
                  <Input
                    label="Name"
                    value={assessmentForm.name}
                    required
                    onChange={(event) => setAssessmentForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <Select
                    label="Type"
                    value={assessmentForm.component_type}
                    options={[
                      { value: 'WRITTEN', label: 'Written' },
                      { value: 'PRACTICAL', label: 'Practical' },
                      { value: 'COURSEWORK', label: 'Coursework' },
                      { value: 'ORAL', label: 'Oral' },
                    ]}
                    onChange={(event) =>
                      setAssessmentForm((prev) => ({ ...prev, component_type: event.target.value }))
                    }
                  />
                  <Input
                    label="Weight Percentage"
                    value={assessmentForm.weight_percentage}
                    onChange={(event) =>
                      setAssessmentForm((prev) => ({ ...prev, weight_percentage: event.target.value }))
                    }
                  />
                  <Input
                    label="Max Mark"
                    value={assessmentForm.max_mark}
                    onChange={(event) => setAssessmentForm((prev) => ({ ...prev, max_mark: event.target.value }))}
                  />
                  <Input
                    label="Duration Minutes"
                    value={assessmentForm.duration_minutes}
                    onChange={(event) =>
                      setAssessmentForm((prev) => ({ ...prev, duration_minutes: event.target.value }))
                    }
                  />
                  <div className="md:col-span-3 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={assessmentForm.is_optional}
                        onChange={(event) =>
                          setAssessmentForm((prev) => ({ ...prev, is_optional: event.target.checked }))
                        }
                      />
                      Optional component
                    </label>
                    <Button
                      type="submit"
                      disabled={
                        createAssessmentMutation.isPending ||
                        !assessmentForm.component_code.trim() ||
                        !assessmentForm.name.trim()
                      }
                    >
                      {createAssessmentMutation.isPending ? 'Creating...' : 'Create Component'}
                    </Button>
                  </div>
                </form>
              </details>
            </Card>
          ) : null}

          {!loading && syllabus ? (
            <Card>
              <h2 className="font-semibold text-gray-900">Entry Options</h2>
              {entryOptions.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4">
                  <p className="text-sm text-gray-600">No entry options found.</p>
                  <p className="mt-1 text-sm text-gray-500">Next action: create an entry option.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {entryOptions.map((option) => (
                    <li key={option.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{option.title}</p>
                          <p className="text-sm text-gray-600">
                            {option.option_code} · {option.zone_code || 'No zone'} · {option.components.length} components
                          </p>
                        </div>
                        {isAdmin ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updateEntryOptionMutation.isPending}
                              onClick={() => {
                                const nextTitle = window.prompt('Entry option title', option.title);
                                if (!nextTitle) return;
                                runAction(async () => {
                                  await updateEntryOptionMutation.mutateAsync({
                                    id: option.id,
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
                              disabled={deleteEntryOptionMutation.isPending}
                              onClick={() => {
                                if (!window.confirm(`Delete entry option "${option.title}"?`)) return;
                                runAction(async () => {
                                  await deleteEntryOptionMutation.mutateAsync(option.id);
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

          {isAdmin && syllabus ? (
            <Card>
              <details>
                <summary className="cursor-pointer select-none text-sm font-medium text-gray-800">
                  Create Entry Option
                </summary>
                <form
                  className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    if (!syllabusId) return;
                    runAction(async () => {
                      await createEntryOptionMutation.mutateAsync({
                        syllabus: syllabusId,
                        option_code: entryOptionForm.option_code.trim(),
                        zone_code: entryOptionForm.zone_code.trim() || undefined,
                        title: entryOptionForm.title.trim(),
                        component_ids: entryOptionComponentIds,
                      });
                      setEntryOptionForm({ option_code: '', zone_code: '', title: '' });
                      setEntryOptionComponentIds([]);
                    });
                  }}
                >
                  <Input
                    label="Option Code"
                    value={entryOptionForm.option_code}
                    required
                    onChange={(event) =>
                      setEntryOptionForm((prev) => ({ ...prev, option_code: event.target.value.toUpperCase() }))
                    }
                  />
                  <Input
                    label="Zone Code (optional)"
                    value={entryOptionForm.zone_code}
                    onChange={(event) => setEntryOptionForm((prev) => ({ ...prev, zone_code: event.target.value }))}
                  />
                  <Input
                    label="Title"
                    value={entryOptionForm.title}
                    required
                    onChange={(event) => setEntryOptionForm((prev) => ({ ...prev, title: event.target.value }))}
                  />
                  <div className="md:col-span-2 rounded-lg border border-gray-200 p-3">
                    <p className="text-sm font-medium text-gray-800">Attach Components</p>
                    {assessmentComponents.length === 0 ? (
                      <p className="mt-1 text-sm text-gray-500">No assessment components available yet.</p>
                    ) : (
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {assessmentComponents.map((component) => {
                          const checked = entryOptionComponentIds.includes(component.id);
                          return (
                            <label key={component.id} className="inline-flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    setEntryOptionComponentIds((prev) => [...prev, component.id]);
                                  } else {
                                    setEntryOptionComponentIds((prev) => prev.filter((id) => id !== component.id));
                                  }
                                }}
                              />
                              {component.component_code} · {component.name}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      type="submit"
                      disabled={
                        createEntryOptionMutation.isPending ||
                        !entryOptionForm.option_code.trim() ||
                        !entryOptionForm.title.trim()
                      }
                    >
                      {createEntryOptionMutation.isPending ? 'Creating...' : 'Create Entry Option'}
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
