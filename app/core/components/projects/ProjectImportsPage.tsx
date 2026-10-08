'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { projectsAPI } from '@/app/core/api/projects';
import { resolveAppError } from '@/app/core/errors';
import { useProjectImports, useProjectMutationInvalidation } from '@/app/core/hooks/useProjects';
import { useAuth } from '@/app/context/AuthContext';

export function ProjectImportsPage() {
  const { capabilities } = useAuth();
  const query = useProjectImports();
  const invalidate = useProjectMutationInvalidation();
  const [file, setFile] = useState<File | null>(null);
  const [authority, setAuthority] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const canUpload =
    capabilities.authorization?.permission_keys.includes('projects.create') ?? false;
  const canVerify =
    capabilities.authorization?.permission_keys.includes('projects.verify_definition') ?? false;
  const upload = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      if (file) form.append('uploaded_file', file);
      form.append('document_kind', 'PROJECT_INSTRUMENT');
      form.append('claimed_authority', authority);
      form.append('claimed_curriculum', curriculum);
      return projectsAPI.uploadImport(form);
    },
    onSuccess: () => {
      setFile(null);
      void invalidate();
    },
  });
  const confirm = useMutation({
    mutationFn: (id: number) => projectsAPI.confirmImport(id),
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
        <h1 className="text-2xl font-bold theme-text">Project imports</h1>
        <p className="mt-1 theme-muted">
          Upload official project instruments and review server processing state.
        </p>
      </div>
      {canUpload ? (
        <Card>
          <form className="grid gap-4 md:grid-cols-3" onSubmit={submit}>
            <Input
              label="Official PDF"
              type="file"
              accept="application/pdf"
              required
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Input
              label="Claimed authority"
              value={authority}
              onChange={(event) => setAuthority(event.target.value)}
            />
            <Input
              label="Claimed curriculum"
              value={curriculum}
              onChange={(event) => setCurriculum(event.target.value)}
            />
            <div className="md:col-span-3">
              <Button type="submit" disabled={!file || upload.isPending}>
                {upload.isPending ? 'Uploading…' : 'Upload instrument'}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="theme-muted">Your server-provided permissions allow import review only.</p>
        </Card>
      )}
      {actionError ? (
        <AppErrorBanner
          error={resolveAppError(actionError, {
            domain: 'projects',
            action: 'submit',
            entityLabel: 'project import',
          })}
        />
      ) : null}
      {query.error ? (
        <AppErrorBanner
          error={resolveAppError(query.error, {
            domain: 'projects',
            action: 'load',
            entityLabel: 'project imports',
          })}
          onAction={() => void query.refetch()}
        />
      ) : null}
      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner message="Loading project imports…" fullScreen={false} />
        </div>
      ) : null}
      <div className="space-y-3">
        {(query.data ?? []).map((job) => (
          <Card
            key={job.id}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="font-semibold theme-text">{job.original_filename}</h2>
              <p className="text-sm theme-muted">
                {new Date(job.uploaded_at).toLocaleString()} ·{' '}
                {job.claimed_authority || 'Authority not supplied'}
              </p>
              {job.safe_failure_message ? (
                <p className="mt-1 text-sm text-[color:var(--color-danger)]">
                  {job.safe_failure_message}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Badge>{job.extraction_status}</Badge>
              {canVerify && job.extraction_status === 'REVIEW_REQUIRED' ? (
                <Button
                  size="sm"
                  onClick={() => confirm.mutate(job.id)}
                  disabled={confirm.isPending}
                >
                  Confirm extraction
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
