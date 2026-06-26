'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Download, Eye, FileText, Plus } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { useCurricula, useSubjects, useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useInstructors } from '@/app/core/hooks/useInstructors';
import { useSchemes } from '@/app/core/hooks/useSchemes';
import type { AdminGroupingMode, AdminWorkViewMode } from '@/app/core/types/adminWorkViews';
import type { SchemeOfWork } from '@/app/core/types/schemes';
import { useAuth } from '@/app/context/AuthContext';
import { isSelfManagedTeachingAdmin } from '@/app/core/lib/workspaces';
import { getReturnBackLabel } from '@/app/core/lib/workspaceReturn';
import { formatTimestamp } from '@/app/plugins/schemes/lib/workflow';

function getStatusVariant(scheme: SchemeOfWork): 'success' | 'warning' | 'default' {
  if (scheme.is_historical) {
    return 'warning';
  }

  if (scheme.status === 'GENERATED') {
    return 'success';
  }

  return 'default';
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function matchesSearch(scheme: SchemeOfWork, search: string): boolean {
  const normalizedSearch = normalizeText(search);
  if (!normalizedSearch) {
    return true;
  }

  return [
    scheme.title,
    scheme.subject_name,
    scheme.level_label,
    scheme.teacher_name,
    scheme.term_name,
    scheme.cohort_name,
    scheme.curriculum_name,
  ].some((value) => normalizeText(value).includes(normalizedSearch));
}

function teacherLabel(scheme: SchemeOfWork): string {
  return scheme.teacher_name?.trim() || 'Unassigned instructor';
}

function toOptionalNumber(value: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface SectionHeadingProps {
  title: string;
  description?: string;
}

function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold theme-text">{title}</h2>
      {description ? <p className="mt-1 text-sm theme-subtle">{description}</p> : null}
    </div>
  );
}

function SchemeCard({
  scheme,
  downloading,
  downloadingCsv,
  onDownloadDocx,
  onDownloadCsv,
  onOpen,
  openLabel,
}: {
  scheme: SchemeOfWork;
  downloading: boolean;
  downloadingCsv: boolean;
  onDownloadDocx: () => void;
  onDownloadCsv: () => void;
  onOpen: () => void;
  openLabel?: string;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold theme-text">{scheme.subject_name}</h3>
            <Badge variant={getStatusVariant(scheme)}>{scheme.status_display}</Badge>
            {scheme.is_historical ? <Badge variant="warning">Historical record</Badge> : null}
          </div>
          <p className="mt-1 text-sm theme-subtle">{scheme.title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="blue">{scheme.entries_count} lesson drafts</Badge>
            <Badge variant="default">{scheme.active_learning_week_count} active weeks</Badge>
            <Badge variant="default">{scheme.lessons_per_week} lessons/week</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onDownloadCsv}
            disabled={downloadingCsv}
          >
            <FileText className="h-4 w-4" />
            {downloadingCsv ? 'Downloading CSV...' : 'CSV'}
          </Button>
          <Button type="button" size="sm" onClick={onDownloadDocx} disabled={downloading}>
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading...' : 'Download Word document'}
          </Button>
          <Button type="button" size="sm" onClick={onOpen}>
            <Eye className="h-4 w-4" />
            {openLabel ?? (scheme.is_historical ? 'Open' : 'Open/Edit')}
          </Button>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Level / Grade
          </dt>
          <dd className="mt-1 text-sm theme-text">{scheme.level_label || 'Not set'}</dd>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Term</dt>
          <dd className="mt-1 text-sm theme-text">{scheme.term_name}</dd>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Teacher</dt>
          <dd className="mt-1 text-sm theme-text">{teacherLabel(scheme)}</dd>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Last updated
          </dt>
          <dd className="mt-1 text-sm theme-text">{formatTimestamp(scheme.updated_at)}</dd>
        </div>
      </dl>
    </Card>
  );
}

interface SchemeGroupSection {
  key: string;
  label: string;
  description: string;
  items: SchemeOfWork[];
}

interface SchemeGroup {
  key: string;
  label: string;
  description: string;
  itemCount: number;
  sections: SchemeGroupSection[];
}

function buildAdminSchemeGroups(
  schemes: SchemeOfWork[],
  groupingMode: AdminGroupingMode,
): SchemeGroup[] {
  const groups = new Map<string, {
    label: string;
    description: string;
    itemCount: number;
    sections: Map<string, SchemeGroupSection>;
  }>();

  schemes.forEach((scheme) => {
    const cohortLabel = scheme.cohort_name?.trim() || 'Unassigned class';
    const subjectLabel = scheme.subject_name?.trim() || 'Unassigned subject';
    const instructorLabel = teacherLabel(scheme);

    let groupKey = `cohort:${scheme.cohort ?? cohortLabel}`;
    let groupLabel = cohortLabel;
    let groupDescription = "Class view starts from learners' classroom context.";
    let sectionKey = `cohort-subject:${scheme.cohort_subject ?? scheme.subject ?? subjectLabel}`;
    let sectionLabel = subjectLabel;
    let sectionDescription = `Teacher: ${instructorLabel}`;

    if (groupingMode === 'instructor') {
      groupKey = `teacher:${scheme.teacher ?? instructorLabel}`;
      groupLabel = instructorLabel;
      groupDescription = 'Instructor view starts from teacher workload.';
      sectionKey = `class-subject:${scheme.cohort ?? cohortLabel}:${scheme.subject ?? subjectLabel}`;
      sectionLabel = `${cohortLabel} · ${subjectLabel}`;
      sectionDescription = 'Class and subject context for this instructor.';
    } else if (groupingMode === 'subject') {
      groupKey = `subject:${scheme.subject ?? subjectLabel}`;
      groupLabel = subjectLabel;
      groupDescription = 'Subject view highlights where the scheme workload sits across classes.';
      sectionKey = `class-teacher:${scheme.cohort ?? cohortLabel}:${scheme.teacher ?? instructorLabel}`;
      sectionLabel = `${cohortLabel} · ${instructorLabel}`;
      sectionDescription = 'Class and instructor context for this subject.';
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        label: groupLabel,
        description: groupDescription,
        itemCount: 0,
        sections: new Map<string, SchemeGroupSection>(),
      });
    }

    const group = groups.get(groupKey);
    if (!group) {
      return;
    }

    group.itemCount += 1;

    if (!group.sections.has(sectionKey)) {
      group.sections.set(sectionKey, {
        key: sectionKey,
        label: sectionLabel,
        description: sectionDescription,
        items: [],
      });
    }

    group.sections.get(sectionKey)?.items.push(scheme);
  });

  return Array.from(groups.entries())
    .map(([key, group]) => ({
      key,
      label: group.label,
      description: group.description,
      itemCount: group.itemCount,
      sections: Array.from(group.sections.values())
        .map((section) => ({
          ...section,
          items: [...section.items].sort((left, right) => left.title.localeCompare(right.title)),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function SchemesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrg, activeRole, capabilities, user } = useAuth();
  const isInstructor = activeRole === 'INSTRUCTOR';
  const isAdminLike = Boolean(user?.is_superadmin) || activeRole === 'ADMIN';
  const canUseTeacherModeAsAdmin = isSelfManagedTeachingAdmin({
    activeRole,
    activeOrg,
    capabilities,
    user,
  });
  const isInstitutionalAdminSupervisor = isAdminLike && !isInstructor && !canUseTeacherModeAsAdmin;
  const instructorAccess = useInstructorCohortAccess();
  const [viewMode, setViewMode] = useState<AdminWorkViewMode>('admin_supervision');
  const [groupingMode, setGroupingMode] = useState<AdminGroupingMode>('class');
  const [search, setSearch] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [cohortSubjectFilter, setCohortSubjectFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  const [instructorFilter, setInstructorFilter] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadingCsvId, setDownloadingCsvId] = useState<number | null>(null);
  const { curricula } = useCurricula();
  const { terms } = useTerms();
  const { subjects } = useSubjects();
  const { cohorts } = useCohorts();
  const { instructors } = useInstructors({ enabled: isInstitutionalAdminSupervisor });
  const selectedInstructorId = useMemo(() => {
    if (!instructorFilter.startsWith('id:')) {
      return undefined;
    }

    const parsed = Number(instructorFilter.slice(3));
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [instructorFilter]);
  const safeReturnTo = useMemo(() => {
    const value = searchParams.get('returnTo');
    return value?.startsWith('/') ? value : null;
  }, [searchParams]);
  const effectiveMyTeachingMode = isInstructor || canUseTeacherModeAsAdmin || viewMode === 'my_teaching';
  const assignedCohortSubjectOptions = useMemo(() => (
    Array.from(
      new Map(
        instructorAccess.assignments
          .filter((assignment) => (
            typeof assignment.cohort_subject_id === 'number'
            && assignment.subject_offering_status !== 'DROPPED_HISTORICAL'
          ))
          .map((assignment) => [
            assignment.cohort_subject_id,
            {
              id: assignment.cohort_subject_id as number,
              cohortId: assignment.cohort_id,
              cohortName: assignment.cohort_name,
              label: `${assignment.cohort_name} - ${assignment.subject_name}`,
            },
          ])
      ).values()
    ).sort((left, right) => left.label.localeCompare(right.label))
  ), [instructorAccess.assignments]);
  const visibleAssignedCohortSubjectOptions = useMemo(
    () => assignedCohortSubjectOptions.filter((option) => (
      !cohortFilter || String(option.cohortId) === cohortFilter
    )),
    [assignedCohortSubjectOptions, cohortFilter]
  );
  const availableCohorts = useMemo(() => {
    if (!effectiveMyTeachingMode) {
      return cohorts;
    }

    return Array.from(
      new Map(
        assignedCohortSubjectOptions.map((option) => [
          option.cohortId,
          {
            id: option.cohortId,
            name: option.cohortName,
          },
        ])
      ).values()
    ).sort((left, right) => left.name.localeCompare(right.name));
  }, [assignedCohortSubjectOptions, cohorts, effectiveMyTeachingMode]);
  const schemeFilters = useMemo(() => ({
    term: toOptionalNumber(termFilter),
    cohort_subject: toOptionalNumber(cohortSubjectFilter),
    subject: cohortSubjectFilter ? undefined : toOptionalNumber(subjectFilter),
    teacher: effectiveMyTeachingMode
      ? user?.id
      : selectedInstructorId,
  }), [cohortSubjectFilter, effectiveMyTeachingMode, selectedInstructorId, subjectFilter, termFilter, user?.id]);
  const { schemes, loading, error, downloadSchemeDocx, downloadSchemeCsv } = useSchemes(schemeFilters);
  const showCreateDraft = isInstructor || canUseTeacherModeAsAdmin;
  const createButtonLabel = effectiveMyTeachingMode
    ? 'Create my draft scheme'
    : 'Create draft scheme';
  const subtitle = isInstructor
    ? 'Create draft schemes, review term coverage, and keep your teaching sequence organized.'
    : viewMode === 'my_teaching'
      ? 'Use My Teaching to view only schemes tied to your own teaching work.'
      : 'Admin supervision shows organization work by class, instructor, and subject.';

  useEffect(() => {
    const requestedCohortSubject = searchParams.get('cohort_subject');
    const requestedSubject = searchParams.get('subject');
    const requestedCohort = searchParams.get('cohort');
    if (requestedCohortSubject && requestedCohortSubject !== cohortSubjectFilter) {
      setCohortSubjectFilter(requestedCohortSubject);
    }
    if (!requestedCohortSubject && requestedSubject && requestedSubject !== subjectFilter) {
      setSubjectFilter(requestedSubject);
    }
    if (requestedCohort && requestedCohort !== cohortFilter) {
      setCohortFilter(requestedCohort);
    }
  }, [cohortFilter, cohortSubjectFilter, searchParams, subjectFilter]);

  useEffect(() => {
    if (canUseTeacherModeAsAdmin && viewMode !== 'my_teaching') {
      setViewMode('my_teaching');
    }
  }, [canUseTeacherModeAsAdmin, viewMode]);

  const instructorOptions = useMemo(() => {
    const options = new Map<string, { value: string; label: string }>();

    instructors.forEach((instructor) => {
      options.set(`id:${instructor.id}`, {
        value: `id:${instructor.id}`,
        label: instructor.full_name || instructor.email,
      });
    });

    schemes.forEach((scheme) => {
      if (typeof scheme.teacher === 'number') {
        const key = `id:${scheme.teacher}`;
        if (!options.has(key)) {
          options.set(key, {
            value: key,
            label: teacherLabel(scheme),
          });
        }
        return;
      }

      const schemeTeacher = normalizeText(scheme.teacher_name);
      if (!schemeTeacher) {
        return;
      }

      const key = `name:${schemeTeacher}`;
      if (!options.has(key)) {
        options.set(key, {
          value: key,
          label: teacherLabel(scheme),
        });
      }
    });

    return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [instructors, schemes]);

  const filteredSchemes = useMemo(
    () => schemes.filter((scheme) => {
      if (!matchesSearch(scheme, search)) {
        return false;
      }

      if (cohortFilter && String(scheme.cohort ?? '') !== cohortFilter) {
        return false;
      }

      if (cohortSubjectFilter && String(scheme.cohort_subject ?? '') !== cohortSubjectFilter) {
        return false;
      }

      if (isInstitutionalAdminSupervisor && viewMode === 'admin_supervision' && instructorFilter) {
        if (instructorFilter.startsWith('id:')) {
          return String(scheme.teacher ?? '') === instructorFilter.slice(3);
        }

        if (instructorFilter.startsWith('name:')) {
          return normalizeText(scheme.teacher_name) === instructorFilter.slice(5);
        }
      }

      return true;
    }),
    [cohortFilter, cohortSubjectFilter, instructorFilter, isInstitutionalAdminSupervisor, schemes, search, viewMode],
  );
  const workspaceHref = useMemo(() => {
    const params = new URLSearchParams();
    if (termFilter) params.set('term', termFilter);
    if (cohortSubjectFilter) params.set('cohort_subject', cohortSubjectFilter);
    if (!cohortSubjectFilter && subjectFilter) params.set('subject', subjectFilter);
    if (cohortFilter) params.set('cohort', cohortFilter);
    if (safeReturnTo) params.set('returnTo', safeReturnTo);
    const query = params.toString();
    return query ? `/schemes?${query}` : '/schemes';
  }, [cohortFilter, cohortSubjectFilter, safeReturnTo, subjectFilter, termFilter]);
  const createSchemeHref = useMemo(() => {
    const params = new URLSearchParams();
    if (cohortSubjectFilter) params.set('cohort_subject', cohortSubjectFilter);
    if (termFilter) params.set('term', termFilter);
    params.set('returnTo', workspaceHref);
    return `/schemes/new?${params.toString()}`;
  }, [cohortSubjectFilter, termFilter, workspaceHref]);
  const backLabel = getReturnBackLabel(safeReturnTo);

  const multipleActiveCurricula = useMemo(() => {
    const activeCount = curricula.filter((curriculum) => curriculum.is_active).length;
    if (activeCount > 1) {
      return true;
    }

    return new Set(filteredSchemes.map((scheme) => normalizeText(scheme.curriculum_name))).size > 1;
  }, [curricula, filteredSchemes]);

  const groupedSchemes = useMemo(() => {
    const groups = new Map<string, Map<string, SchemeOfWork[]>>();

    filteredSchemes.forEach((scheme) => {
      const outerKey = multipleActiveCurricula
        ? scheme.curriculum_name || 'Unlabelled curriculum'
        : scheme.subject_name || 'Unlabelled subject';
      const innerKey = multipleActiveCurricula
        ? `${scheme.subject_name || 'Unlabelled subject'}:::${scheme.level_label || 'Unlabelled level'}`
        : scheme.level_label || 'Unlabelled level';

      if (!groups.has(outerKey)) {
        groups.set(outerKey, new Map<string, SchemeOfWork[]>());
      }

      const innerGroup = groups.get(outerKey);
      if (!innerGroup) {
        return;
      }

      const current = innerGroup.get(innerKey) ?? [];
      current.push(scheme);
      innerGroup.set(innerKey, current);
    });

    return Array.from(groups.entries());
  }, [filteredSchemes, multipleActiveCurricula]);

  const adminGroupedSchemes = useMemo(
    () => (isInstitutionalAdminSupervisor && viewMode === 'admin_supervision'
      ? buildAdminSchemeGroups(filteredSchemes, groupingMode)
      : []),
    [filteredSchemes, groupingMode, isInstitutionalAdminSupervisor, viewMode],
  );

  const handleDownloadDocx = async (schemeId: number) => {
    try {
      setActionError(null);
      setDownloadingId(schemeId);
      await downloadSchemeDocx(schemeId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not download the Word document.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadCsv = async (schemeId: number) => {
    try {
      setActionError(null);
      setDownloadingCsvId(schemeId);
      await downloadSchemeCsv(schemeId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not download the scheme CSV.');
    } finally {
      setDownloadingCsvId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading schemes of work..." fullScreen={false} />;
  }

  if (error) {
    return <ErrorState message={error} fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold theme-text">
            {effectiveMyTeachingMode
              ? 'My Schemes of Work'
              : isInstitutionalAdminSupervisor
                ? 'Schemes of Work Supervision'
                : 'Schemes of Work'}
          </h1>
          <p className="mt-1 text-sm theme-subtle">{subtitle}</p>
        </div>
        {safeReturnTo ? (
          <Link href={safeReturnTo}>
            <Button type="button" variant="ghost" size="sm">
              {backLabel}
            </Button>
          </Link>
        ) : null}
        {showCreateDraft ? (
          <Link href={createSchemeHref}>
            <Button type="button">
              <Plus className="h-4 w-4" />
              {createButtonLabel}
            </Button>
          </Link>
        ) : null}
      </div>

      {isInstitutionalAdminSupervisor ? (
        <Card>
          <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-semibold theme-text">Workspace mode</h2>
                <p className="text-sm theme-subtle">
                  Admin supervision shows organization work by class, instructor, and subject.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === 'admin_supervision' ? 'secondary' : 'ghost'}
                  onClick={() => setViewMode('admin_supervision')}
                >
                  Admin supervision
                </Button>
                {canUseTeacherModeAsAdmin ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === 'my_teaching' ? 'secondary' : 'ghost'}
                    onClick={() => setViewMode('my_teaching')}
                  >
                    My Teaching
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Admin supervision shows organization work by class, instructor, and subject.
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                Use My Teaching to view only your own teaching work.
              </div>
            </div>

            {viewMode === 'admin_supervision' ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold theme-text">Grouping</h3>
                  <p className="text-sm theme-subtle">
                    {groupingMode === 'instructor'
                      ? 'Instructor view starts from teacher workload.'
                      : "Class view starts from learners' classroom context."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={groupingMode === 'class' ? 'secondary' : 'ghost'}
                    onClick={() => setGroupingMode('class')}
                  >
                    Class view
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={groupingMode === 'instructor' ? 'secondary' : 'ghost'}
                    onClick={() => setGroupingMode('instructor')}
                  >
                    Instructor view
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {actionError ? (
        <ErrorBanner
          title="Download failed"
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      ) : null}

      <Card>
        <div className={`grid grid-cols-1 gap-4 ${isInstitutionalAdminSupervisor && viewMode === 'admin_supervision' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search schemes"
            label="Search"
          />
          <Select
            label="Term"
            value={termFilter}
            onChange={(event) => setTermFilter(event.target.value)}
            options={[
              { value: '', label: 'All terms' },
              ...terms.map((term) => ({ value: String(term.id), label: term.name })),
            ]}
          />
          {effectiveMyTeachingMode ? (
            <Select
              label="Class subject"
              value={cohortSubjectFilter}
              onChange={(event) => setCohortSubjectFilter(event.target.value)}
              options={[
                { value: '', label: 'All class subjects' },
                ...visibleAssignedCohortSubjectOptions.map((option) => ({
                  value: String(option.id),
                  label: option.label,
                })),
              ]}
            />
          ) : (
            <Select
              label="Subject"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              options={[
                { value: '', label: 'All subjects' },
                ...subjects.map((subject) => ({ value: String(subject.id), label: subject.name })),
              ]}
            />
          )}
          <Select
            label="Class"
            value={cohortFilter}
            onChange={(event) => setCohortFilter(event.target.value)}
            options={[
              { value: '', label: 'All classes' },
              ...availableCohorts.map((cohort) => ({ value: String(cohort.id), label: cohort.name })),
            ]}
          />
          {isInstitutionalAdminSupervisor && viewMode === 'admin_supervision' ? (
            <Select
              label="Instructor"
              value={instructorFilter}
              onChange={(event) => setInstructorFilter(event.target.value)}
              options={[
                { value: '', label: 'All instructors' },
                ...instructorOptions,
              ]}
            />
          ) : null}
        </div>
      </Card>

      {filteredSchemes.length === 0 ? (
        <Card className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold theme-text">
              {search || termFilter || cohortSubjectFilter || subjectFilter || cohortFilter || (viewMode === 'admin_supervision' && instructorFilter)
                ? 'No schemes match these filters'
                : 'No schemes created yet'}
            </h2>
            <p className="mt-1 text-sm theme-subtle">
              {viewMode === 'my_teaching'
                ? 'No schemes are visible in your My Teaching view yet.'
                : isInstitutionalAdminSupervisor
                  ? 'Generated schemes will appear here by class, subject, and responsible instructor.'
                  : 'Create a draft scheme from your term plan.'}
            </p>
          </div>
          {showCreateDraft ? (
            <div className="flex justify-center">
              <Link href={createSchemeHref}>
                <Button type="button">
                  <Plus className="h-4 w-4" />
                  {createButtonLabel}
                </Button>
              </Link>
            </div>
          ) : null}
        </Card>
      ) : isInstitutionalAdminSupervisor && viewMode === 'admin_supervision' ? (
        adminGroupedSchemes.map((group) => (
          <section key={group.key} className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading title={group.label} description={group.description} />
              <Badge variant="blue" size="sm">
                {group.itemCount} scheme{group.itemCount === 1 ? '' : 's'}
              </Badge>
            </div>

            {group.sections.map((section) => (
              <div key={section.key} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold theme-text">{section.label}</h3>
                  <p className="text-sm theme-subtle">{section.description}</p>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {section.items.map((scheme) => (
                    <SchemeCard
                      key={scheme.id}
                      scheme={scheme}
                      downloading={downloadingId === scheme.id}
                      downloadingCsv={downloadingCsvId === scheme.id}
                      onDownloadDocx={() => void handleDownloadDocx(scheme.id)}
                      onDownloadCsv={() => void handleDownloadCsv(scheme.id)}
                      openLabel="Instructor progress"
                      onOpen={() => {
                        if (!scheme.teacher) {
                          router.push(`/schemes/${scheme.id}`);
                          return;
                        }
                        const params = new URLSearchParams({ section: 'schemes' });
                        if (scheme.cohort) {
                          params.set('cohort', String(scheme.cohort));
                        }
                        if (scheme.cohort_subject) {
                          params.set('cohort_subject', String(scheme.cohort_subject));
                        }
                        router.push(`/admin/instructors/${scheme.teacher}/progress?${params.toString()}`);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      ) : (
        groupedSchemes.map(([outerLabel, groups]) => (
          <section key={outerLabel} className="space-y-4">
            <SectionHeading
              title={outerLabel}
              description={multipleActiveCurricula ? 'Curriculum grouping' : 'Subject grouping'}
            />

            {Array.from(groups.entries()).map(([innerLabel, schemesInGroup]) => {
              const title = multipleActiveCurricula ? innerLabel.split(':::')[0] : innerLabel;
              const description = multipleActiveCurricula
                ? innerLabel.split(':::')[1]
                : 'Level / Grade';

              return (
                <div key={`${outerLabel}-${innerLabel}`} className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold theme-text">{title}</h3>
                    <p className="text-sm theme-subtle">{description}</p>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {schemesInGroup.map((scheme) => (
                      <SchemeCard
                        key={scheme.id}
                        scheme={scheme}
                        downloading={downloadingId === scheme.id}
                        downloadingCsv={downloadingCsvId === scheme.id}
                        onDownloadDocx={() => void handleDownloadDocx(scheme.id)}
                        onDownloadCsv={() => void handleDownloadCsv(scheme.id)}
                        onOpen={() => router.push(`/schemes/${scheme.id}`)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
