'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { projectsAPI } from '@/app/core/api/projects';
import { resolveAppError } from '@/app/core/errors';
import { useProjectCatalogue, useProjectMutationInvalidation } from '@/app/core/hooks/useProjects';
import type { ProjectDefinitionVersion } from '@/app/core/types/projects';

function CatalogueSection({
  title,
  description,
  rows,
  onDeploy,
}: {
  title: string;
  description: string;
  rows: ProjectDefinitionVersion[];
  onDeploy: (definition: ProjectDefinitionVersion) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold theme-text">{title}</h2>
        <p className="text-sm theme-muted">{description}</p>
      </div>
      {!rows.length ? <Card><p className="text-sm theme-muted">No eligible projects returned by the server.</p></Card> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {rows.map((definition) => (
          <Card key={definition.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold theme-text">{definition.title}</h3>
                <p className="text-sm theme-muted">
                  {definition.subject_key} · {definition.level_key} · {definition.assessment_year}
                </p>
              </div>
              <Badge>{definition.catalogue_scope === 'PLATFORM_OFFICIAL' ? 'Official' : 'Organization project'}</Badge>
            </div>
            <p className="text-sm theme-muted">{definition.summary || 'No summary supplied.'}</p>
            <div className="flex flex-wrap gap-2">
              <Badge>Version {definition.version}</Badge>
              <Badge>{definition.maximum_marks} marks</Badge>
              <Badge>{definition.tasks.length} tasks</Badge>
              {definition.catalogue_scope === 'PLATFORM_OFFICIAL' ? <Badge>Read-only definition</Badge> : null}
            </div>
            <p className="text-sm theme-muted">
              {definition.eligible_cohort_subjects.length} server-authorized deployment target(s)
            </p>
            {definition.authority.can_deploy ? (
              <Button size="sm" onClick={() => onDeploy(definition)}>Create deployment</Button>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

export function ProjectCataloguePage() {
  const query = useProjectCatalogue();
  const invalidate = useProjectMutationInvalidation();
  const [selected, setSelected] = useState<ProjectDefinitionVersion | null>(null);
  const [targetId, setTargetId] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [deadline, setDeadline] = useState('');
  const [instructions, setInstructions] = useState('');
  const official = useMemo(
    () => (query.data ?? []).filter((row) => row.catalogue_scope === 'PLATFORM_OFFICIAL'),
    [query.data],
  );
  const custom = useMemo(
    () => (query.data ?? []).filter((row) => row.catalogue_scope === 'ORGANIZATION_CUSTOM'),
    [query.data],
  );
  const creation = useMutation({
    mutationFn: async () => {
      const target = selected?.eligible_cohort_subjects.find((row) => row.id === Number(targetId));
      if (!selected || !target) throw new Error('Choose a server-authorized cohort subject.');
      return projectsAPI.createDeployment({
        definition_version: selected.id,
        cohort_subject: target.id,
        academic_year: target.academic_year,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        submission_deadline: deadline || undefined,
        local_operational_instructions: instructions,
      });
    },
    onSuccess: () => {
      setSelected(null);
      setTargetId('');
      void invalidate();
    },
  });
  const chooseDefinition = (definition: ProjectDefinitionVersion) => {
    setSelected(definition);
    const first = definition.eligible_cohort_subjects.find((row) => row.can_deploy);
    setTargetId(first ? String(first.id) : '');
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    creation.mutate();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold theme-text">Project catalogue</h1>
        <p className="mt-1 theme-muted">Only official and organization projects eligible for your current teaching or supervision scope are shown.</p>
      </div>
      {query.error ? <AppErrorBanner error={resolveAppError(query.error, { domain: 'projects', action: 'load', entityLabel: 'catalogue' })} onAction={() => void query.refetch()} /> : null}
      {creation.error ? <AppErrorBanner error={resolveAppError(creation.error, { domain: 'projects', action: 'create', entityLabel: 'deployment' })} /> : null}
      {query.isLoading ? <div className="flex justify-center py-16"><LoadingSpinner message="Loading eligible project catalogue…" fullScreen={false} /></div> : null}
      <CatalogueSection title="Eligible official projects" description="Authority-issued projects matched by the server to this school, subject, level, year and your scope." rows={official} onDeploy={chooseDefinition} />
      <CatalogueSection title="Custom institutional projects" description="Projects owned by this organization and aligned to an eligible local teaching target." rows={custom} onDeploy={chooseDefinition} />
      {selected ? (
        <Card>
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <h2 className="font-semibold theme-text">Create deployment: {selected.title}</h2>
              <p className="text-sm theme-muted">Project content is fixed at version {selected.version}; choose only from targets returned by the server.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Eligible cohort subject" value={targetId} onChange={(event) => setTargetId(event.target.value)} options={selected.eligible_cohort_subjects.filter((row) => row.can_deploy).map((row) => ({ value: row.id, label: `${row.cohort.name} — ${row.subject.name}` }))} />
              <Input label="Scheduled start" type="date" required value={scheduledStart} onChange={(event) => setScheduledStart(event.target.value)} />
              <Input label="Scheduled end" type="date" required value={scheduledEnd} onChange={(event) => setScheduledEnd(event.target.value)} />
              <Input label="Submission deadline" type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
            </div>
            <label className="block text-sm theme-text">Local operational instructions
              <textarea className="mt-1 min-h-24 w-full rounded-md border p-3 theme-surface" value={instructions} onChange={(event) => setInstructions(event.target.value)} />
            </label>
            <div className="flex gap-2"><Button type="submit" disabled={!targetId || !scheduledStart || !scheduledEnd || creation.isPending}>{creation.isPending ? 'Creating…' : 'Create deployment'}</Button><Button type="button" variant="secondary" onClick={() => setSelected(null)}>Cancel</Button></div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
