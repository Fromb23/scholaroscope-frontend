'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { resolveAppError } from '@/app/core/errors';
import { useProjectWorkspace } from '@/app/core/hooks/useProjects';
import { buildProjectDetailHref, projectBackHref } from './projectNavigation';
import { ProjectScheduleStatus } from './ProjectScheduleStatus';

export function ProjectStreamSelectionPage() {
  const route = useParams<{ definitionVersionId: string }>();
  const searchParams = useSearchParams();
  const definitionVersion = Number(route.definitionVersionId);
  const query = useProjectWorkspace(
    Number.isFinite(definitionVersion) && definitionVersion > 0 ? definitionVersion : null,
  );
  const backHref = projectBackHref(searchParams.get('returnTo'));
  const selectionHref = `/projects/definitions/${definitionVersion}`;

  if (query.isLoading) return <LoadingSpinner message="Loading authorized streams…" />;
  if (query.error) {
    return (
      <AppErrorBanner
        error={resolveAppError(query.error, {
          domain: 'projects',
          action: 'load',
          entityLabel: 'project streams',
        })}
        onAction={() => void query.refetch()}
      />
    );
  }
  const project = query.data;
  if (!project) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to projects
          </Button>
        </Link>
        <h1 className="mt-3 text-2xl font-bold theme-text">{project.title}</h1>
        <p className="mt-1 theme-muted">
          {project.subject.name} · {project.level_key} · Choose an authorized stream
        </p>
      </div>
      <Card className="flex flex-wrap gap-2">
        <Badge>
          {project.stream_count} accessible {project.stream_count === 1 ? 'stream' : 'streams'}
        </Badge>
        <Badge>{project.total_learner_count} learners across streams</Badge>
        <Badge>{project.assessment_year}</Badge>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {project.deployments.map((deployment) => (
          <Card key={deployment.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold theme-text">{deployment.cohort.name}</h2>
                <p className="text-sm theme-muted">{deployment.subject.name}</p>
              </div>
              <Badge variant={deployment.readiness.state === 'ATTENTION' ? 'warning' : 'info'}>
                {deployment.status}
              </Badge>
            </div>
            <p className="flex items-center gap-2 text-sm theme-muted">
              <Users className="h-4 w-4" />
              {deployment.participant_count} learners · {deployment.administering_instructor_name}
            </p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Metric
                label="Tasks"
                value={`${deployment.progress.completed_task_count}/${deployment.progress.task_count}`}
              />
              <Metric label="Evidence" value={deployment.progress.evidence_count} />
              <Metric label="Evaluations" value={deployment.progress.evaluation_count} />
            </div>
            <ProjectScheduleStatus schedule={deployment.schedule} compact />
            <div className="flex justify-end">
              <Link href={buildProjectDetailHref(deployment.id, selectionHref)}>
                <Button size="sm">Open stream workspace</Button>
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
