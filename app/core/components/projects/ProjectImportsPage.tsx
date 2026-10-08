'use client';

import { useState, type FormEvent } from 'react';
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
import { useCohortSubjects } from '@/app/core/hooks/useCohortSubjects';
import { useProjectImports, useProjectMutationInvalidation } from '@/app/core/hooks/useProjects';
import { useAuth } from '@/app/context/AuthContext';

export function ProjectImportsPage() {
  const { capabilities } = useAuth();
  const query = useProjectImports();
  const { cohortSubjects } = useCohortSubjects();
  const invalidate = useProjectMutationInvalidation();
  const [file, setFile] = useState<File | null>(null);
  const [targetByJob, setTargetByJob] = useState<Record<number, string>>({});
  const canCreate = capabilities.authorization?.permission_keys.includes('projects.create') ?? false;
  const upload = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      if (file) form.append('uploaded_file', file);
      form.append('document_kind', 'PROJECT_INSTRUMENT');
      return projectsAPI.uploadImport(form);
    },
    onSuccess: () => {
      setFile(null);
      void invalidate();
    },
  });
  const confirm = useMutation({
    mutationFn: ({ id, target }: { id: number; target: number }) => projectsAPI.confirmImport(id, target),
    onSuccess: invalidate,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (file) upload.mutate();
  };
  const actionError = upload.error ?? confirm.error;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold theme-text">Custom organization projects</h1>
        <p className="mt-1 theme-muted">Import an institutional project document owned only by this organization. Official authority instruments are registered in the separate platform control plane.</p>
      </div>
      {canCreate ? (
        <Card>
          <form className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={submit}>
            <Input label="Custom project PDF" type="file" accept="application/pdf" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <Button type="submit" disabled={!file || upload.isPending}>{upload.isPending ? 'Importing…' : 'Import custom project'}</Button>
          </form>
        </Card>
      ) : <Card><p className="theme-muted">Your server-provided permissions do not allow custom project creation.</p></Card>}
      {actionError ? <AppErrorBanner error={resolveAppError(actionError, { domain: 'projects', action: 'submit', entityLabel: 'custom project import' })} /> : null}
      {query.error ? <AppErrorBanner error={resolveAppError(query.error, { domain: 'projects', action: 'load', entityLabel: 'custom project imports' })} onAction={() => void query.refetch()} /> : null}
      {query.isLoading ? <div className="flex justify-center py-12"><LoadingSpinner message="Loading custom project imports…" fullScreen={false} /></div> : null}
      <div className="space-y-3">
        {(query.data ?? []).map((job) => (
          <Card key={job.id} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold theme-text">{job.original_filename}</h2>
                <p className="text-sm theme-muted">Organization project · {new Date(job.uploaded_at).toLocaleString()}</p>
                {job.safe_failure_message ? <p className="mt-1 text-sm text-[color:var(--color-danger)]">{job.safe_failure_message}</p> : null}
              </div>
              <Badge>{job.extraction_status}</Badge>
            </div>
            {canCreate && job.extraction_status === 'REVIEW_REQUIRED' ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <Select label="Organization cohort subject" value={targetByJob[job.id] ?? ''} onChange={(event) => setTargetByJob((current) => ({ ...current, [job.id]: event.target.value }))} options={[{ value: '', label: 'Choose an academic target' }, ...cohortSubjects.map((row) => ({ value: row.id, label: `${row.cohort_name} — ${row.subject_name}` }))]} />
                <Button size="sm" onClick={() => confirm.mutate({ id: job.id, target: Number(targetByJob[job.id]) })} disabled={!targetByJob[job.id] || confirm.isPending}>Confirm custom project</Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
