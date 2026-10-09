'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, FolderKanban, Import } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { resolveAppError } from '@/app/core/errors';
import { useProjectDeployments } from '@/app/core/hooks/useProjects';
import { useAuth } from '@/app/context/AuthContext';
import { buildProjectDetailHref } from './projectNavigation';
import { ProjectScheduleStatus } from './ProjectScheduleStatus';

const statusOptions = [
  '',
  'DRAFT',
  'READY',
  'PUBLISHED',
  'ACTIVE',
  'COMPLETED',
  'FINALIZED',
  'ARCHIVED',
  'CANCELLED',
].map((value) => ({ value, label: value ? value.replaceAll('_', ' ') : 'All lifecycle states' }));

export function ProjectsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { capabilities } = useAuth();
  const canCreateCustom = capabilities.authorization?.permission_keys.includes('projects.create') ?? false;
  const canOpenCatalogue = capabilities.authorization?.permission_keys.includes('projects.catalogue.register') ?? false;
  const [status, setStatusState] = useState(searchParams.get('status') ?? '');
  const [subject, setSubjectState] = useState(searchParams.get('subject') ?? '');
  const [cohort, setCohortState] = useState(searchParams.get('cohort') ?? '');
  const [search, setSearchState] = useState(searchParams.get('search') ?? '');
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const setStatus = (value: string) => { setStatusState(value); updateFilter('status', value); };
  const setSubject = (value: string) => { setSubjectState(value); updateFilter('subject', value); };
  const setCohort = (value: string) => { setCohortState(value); updateFilter('cohort', value); };
  const setSearch = (value: string) => { setSearchState(value); updateFilter('search', value); };
  const currentParams = new URLSearchParams();
  if (status) currentParams.set('status', status);
  if (subject) currentParams.set('subject', subject);
  if (cohort) currentParams.set('cohort', cohort);
  if (search) currentParams.set('search', search);
  const returnTo = currentParams.size ? `${pathname}?${currentParams}` : pathname;
  const query = useProjectDeployments({
    status: status || undefined,
    subject: subject ? Number(subject) : undefined,
    cohort: cohort ? Number(cohort) : undefined,
  });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const subjects = useMemo(
    () => Array.from(new Map(rows.map((row) => [row.subject.id, row.subject])).values()),
    [rows],
  );
  const cohorts = useMemo(
    () => Array.from(new Map(rows.map((row) => [row.cohort.id, row.cohort])).values()),
    [rows],
  );
  const visibleRows = search.trim()
    ? rows.filter((row) =>
        `${row.title} ${row.subject.name} ${row.cohort.name}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : rows;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold theme-text">Projects</h1>
          <p className="mt-1 theme-muted">
            Active and historical deployments authorized for your teaching or supervision scope.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canOpenCatalogue ? (
            <Link href={`/projects/catalogue?returnTo=${encodeURIComponent(returnTo)}`}>
              <Button variant="secondary">
                <BookOpen className="h-4 w-4" />
                Catalogue
              </Button>
            </Link>
          ) : null}
          {canCreateCustom ? (
            <Link href={`/projects/imports?returnTo=${encodeURIComponent(returnTo)}`}>
              <Button variant="secondary">
                <Import className="h-4 w-4" />
                Create custom project
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <Card className="grid gap-4 md:grid-cols-4">
        <Input
          label="Search visible projects"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Title, subject or cohort"
        />
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={statusOptions}
        />
        <Select
          label="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          options={[
            { value: '', label: 'All subjects' },
            ...subjects.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Select
          label="Cohort"
          value={cohort}
          onChange={(event) => setCohort(event.target.value)}
          options={[
            { value: '', label: 'All cohorts' },
            ...cohorts.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
      </Card>

      {query.error ? (
        <AppErrorBanner
          error={resolveAppError(query.error, {
            domain: 'projects',
            action: 'load',
            entityLabel: 'projects',
          })}
          onAction={() => void query.refetch()}
        />
      ) : null}
      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner message="Loading authorized projects…" fullScreen={false} />
        </div>
      ) : null}
      {!query.isLoading && !visibleRows.length ? (
        <Card className="py-12 text-center">
          <FolderKanban className="mx-auto h-10 w-10 theme-subtle" />
          <h2 className="mt-3 font-semibold theme-text">No authorized projects found</h2>
          <p className="mt-1 text-sm theme-muted">
            The server did not return a deployment for these filters.
          </p>
        </Card>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {visibleRows.map((project) => (
          <Card key={project.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold theme-text">{project.title}</h2>
                <p className="text-sm theme-muted">
                  {project.subject.name} · {project.cohort.name}
                </p>
              </div>
              <Badge variant={project.readiness.state === 'ATTENTION' ? 'warning' : 'info'}>
                {project.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <span className="theme-subtle">Participants</span>
                <p className="font-semibold theme-text">{project.participant_count}</p>
              </div>
              <div>
                <span className="theme-subtle">Tasks</span>
                <p className="font-semibold theme-text">
                  {project.progress.completed_task_count}/{project.progress.task_count}
                </p>
              </div>
              <div>
                <span className="theme-subtle">Evidence</span>
                <p className="font-semibold theme-text">{project.progress.evidence_count}</p>
              </div>
              <div>
                <span className="theme-subtle">Evaluations</span>
                <p className="font-semibold theme-text">{project.progress.evaluation_count}</p>
              </div>
            </div>
            <p className="text-sm theme-muted">
              {project.scheduled_start} – {project.scheduled_end} ·{' '}
              {project.administering_instructor_name}
            </p>
            <ProjectScheduleStatus schedule={project.schedule} compact />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {project.authority.allowed_actions
                  .filter((action) => action !== 'view')
                  .map((action) => (
                    <Badge key={action} size="sm">
                      {action.replaceAll('_', ' ')}
                    </Badge>
                  ))}
              </div>
              <Link href={buildProjectDetailHref(project.id, returnTo)}>
                <Button size="sm">Open project</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
