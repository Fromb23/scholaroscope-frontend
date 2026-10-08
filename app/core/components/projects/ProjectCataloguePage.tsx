'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { projectsAPI } from '@/app/core/api/projects';
import { resolveAppError } from '@/app/core/errors';
import { useProjectCatalogue, useProjectMutationInvalidation } from '@/app/core/hooks/useProjects';
import { useAuth } from '@/app/context/AuthContext';

export function ProjectCataloguePage() {
  const { capabilities } = useAuth();
  const [curriculum, setCurriculum] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const query = useProjectCatalogue({
    curriculum_key: curriculum || undefined,
    subject_key: subject || undefined,
    level_key: level || undefined,
  });
  const invalidate = useProjectMutationInvalidation();
  const adoption = useMutation({
    mutationFn: (id: number) => projectsAPI.adoptDefinition(id),
    onSuccess: invalidate,
  });
  const canVerify =
    capabilities.authorization?.permission_keys.includes('projects.verify_definition') ?? false;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold theme-text">Project catalogue</h1>
        <p className="mt-1 theme-muted">
          Published and reviewable definitions, their versions, tasks and workspace adoption state.
        </p>
      </div>
      <Card className="grid gap-4 md:grid-cols-3">
        <Input
          label="Curriculum key"
          value={curriculum}
          onChange={(event) => setCurriculum(event.target.value)}
        />
        <Input
          label="Subject key"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
        <Input label="Level key" value={level} onChange={(event) => setLevel(event.target.value)} />
      </Card>
      {query.error ? (
        <AppErrorBanner
          error={resolveAppError(query.error, {
            domain: 'projects',
            action: 'load',
            entityLabel: 'catalogue',
          })}
          onAction={() => void query.refetch()}
        />
      ) : null}
      {adoption.error ? (
        <AppErrorBanner
          error={resolveAppError(adoption.error, {
            domain: 'projects',
            action: 'update',
            entityLabel: 'definition adoption',
          })}
        />
      ) : null}
      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner message="Loading project catalogue…" fullScreen={false} />
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {(query.data ?? []).map((definition) => (
          <Card key={definition.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold theme-text">{definition.title}</h2>
                <p className="text-sm theme-muted">
                  {definition.curriculum_key} · {definition.subject_key} · {definition.level_key}
                </p>
              </div>
              <Badge>{definition.status}</Badge>
            </div>
            <p className="text-sm theme-muted">{definition.summary || 'No summary supplied.'}</p>
            <div className="flex flex-wrap gap-2">
              <Badge>Version {definition.version}</Badge>
              <Badge>{definition.maximum_marks} marks</Badge>
              <Badge>{definition.tasks.length} tasks</Badge>
              <Badge>{definition.verification_tier}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm theme-muted">
                {definition.organization_adoption
                  ? `Workspace: ${definition.organization_adoption.decision}`
                  : 'Not adopted by this workspace'}
              </p>
              {canVerify && !definition.organization_adoption ? (
                <Button
                  size="sm"
                  onClick={() => adoption.mutate(definition.id)}
                  disabled={adoption.isPending}
                >
                  Adopt definition
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
