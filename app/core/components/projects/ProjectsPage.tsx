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
import { useProjectWorkspaces } from '@/app/core/hooks/useProjects';
import { useAuth } from '@/app/context/AuthContext';
import { buildProjectDefinitionHref } from './projectNavigation';

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
].map((value) => ({ value, label: value ? value.replaceAll('_', ' ') : 'All stream states' }));

export function ProjectsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { capabilities } = useAuth();
  const canCreateCustom =
    capabilities.authorization?.permission_keys.includes('projects.create') ?? false;
  const canOpenCatalogue =
    capabilities.authorization?.permission_keys.includes('projects.catalogue.register') ?? false;
  const [status, setStatusState] = useState(searchParams.get('status') ?? '');
  const [subject, setSubjectState] = useState(searchParams.get('subject') ?? '');
  const [cohort, setCohortState] = useState(searchParams.get('cohort') ?? '');
  const [search, setSearchState] = useState(searchParams.get('search') ?? '');
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  };
  const query = useProjectWorkspaces();
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const subjects = useMemo(
    () => Array.from(new Map(rows.map((row) => [row.subject.id, row.subject])).values()),
    [rows],
  );
  const cohorts = useMemo(
    () =>
      Array.from(
        new Map(
          rows.flatMap((row) =>
            row.deployments.map((deployment) => [deployment.cohort.id, deployment.cohort] as const),
          ),
        ).values(),
      ),
    [rows],
  );
  const visibleRows = rows.filter((row) => {
    if (status && !row.deployments.some((deployment) => deployment.status === status)) return false;
    if (subject && row.subject.id !== Number(subject)) return false;
    if (cohort && !row.deployments.some((deployment) => deployment.cohort.id === Number(cohort)))
      return false;
    const haystack = `${row.title} ${row.subject.name} ${row.deployments.map((deployment) => deployment.cohort.name).join(' ')}`;
    return !search.trim() || haystack.toLowerCase().includes(search.trim().toLowerCase());
  });
  const currentParams = new URLSearchParams(searchParams.toString());
  const returnTo = currentParams.size ? `${pathname}?${currentParams}` : pathname;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold theme-text">Projects</h1>
          <p className="mt-1 theme-muted">
            Each project contains only the streams authorized for your teaching or supervision
            scope.
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
          onChange={(event) => {
            setSearchState(event.target.value);
            updateFilter('search', event.target.value);
          }}
          placeholder="Title, subject or stream"
        />
        <Select
          label="Stream status"
          value={status}
          onChange={(event) => {
            setStatusState(event.target.value);
            updateFilter('status', event.target.value);
          }}
          options={statusOptions}
        />
        <Select
          label="Subject"
          value={subject}
          onChange={(event) => {
            setSubjectState(event.target.value);
            updateFilter('subject', event.target.value);
          }}
          options={[
            { value: '', label: 'All subjects' },
            ...subjects.map((item) => ({ value: item.id ?? '', label: item.name })),
          ]}
        />
        <Select
          label="Stream"
          value={cohort}
          onChange={(event) => {
            setCohortState(event.target.value);
            updateFilter('cohort', event.target.value);
          }}
          options={[
            { value: '', label: 'All streams' },
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
            The server did not return an authorized project for these filters.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleRows.map((project) => (
          <Card key={project.definition_version} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold theme-text">{project.title}</h2>
                <p className="text-sm theme-muted">
                  {project.subject.name} · {project.level_key}
                </p>
              </div>
              <Badge variant="info">
                {project.stream_count} accessible{' '}
                {project.stream_count === 1 ? 'stream' : 'streams'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Metric label="Learners across streams" value={project.total_learner_count} />
              <Metric
                label="Tasks across streams"
                value={`${project.deployments.reduce((sum, row) => sum + row.progress.completed_task_count, 0)}/${project.deployments.reduce((sum, row) => sum + row.progress.task_count, 0)}`}
              />
              <Metric
                label="Evidence"
                value={project.deployments.reduce(
                  (sum, row) => sum + row.progress.evidence_count,
                  0,
                )}
              />
              <Metric
                label="Evaluations"
                value={project.deployments.reduce(
                  (sum, row) => sum + row.progress.evaluation_count,
                  0,
                )}
              />
            </div>
            <p className="text-sm theme-muted">
              Lifecycle by stream:{' '}
              {Object.entries(project.lifecycle_summary.status_counts)
                .map(([state, count]) => `${count} ${state.toLowerCase()}`)
                .join(', ')}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {project.deployments.map((deployment) => (
                  <Badge key={deployment.id} size="sm">
                    {deployment.cohort.name}
                  </Badge>
                ))}
              </div>
              <Link href={buildProjectDefinitionHref(project.definition_version, returnTo)}>
                <Button size="sm">Open project</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="theme-subtle">{label}</span>
      <p className="font-semibold theme-text">{value}</p>
    </div>
  );
}
