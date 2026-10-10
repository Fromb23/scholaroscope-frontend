'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { resolveAppError } from '@/app/core/errors';
import {
  useMissingProjectStreams,
  useProjectWorkspace,
  useProjectWorkspaceMutations,
} from '@/app/core/hooks/useProjects';
import { buildProjectDetailHref, projectBackHref } from './projectNavigation';
import { ProjectScheduleStatus } from './ProjectScheduleStatus';

export function ProjectStreamSelectionPage() {
  const route = useParams<{ definitionVersionId: string }>();
  const searchParams = useSearchParams();
  const definitionVersion = Number(route.definitionVersionId);
  const query = useProjectWorkspace(
    Number.isFinite(definitionVersion) && definitionVersion > 0 ? definitionVersion : null,
  );
  const [showMissing, setShowMissing] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [selectedMissing, setSelectedMissing] = useState<Record<number, number | undefined>>({});
  const [selectedExpired, setSelectedExpired] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const canReconcile = query.data?.authority?.can_reconcile_streams === true;
  const missing = useMissingProjectStreams(canReconcile ? definitionVersion : null);
  const mutations = useProjectWorkspaceMutations(definitionVersion);
  const backHref = projectBackHref(searchParams.get('returnTo'));
  const selectionHref = `/projects/definitions/${definitionVersion}`;
  const previewRows = missing.data ?? [];
  const actionableRows = previewRows.filter(
    (row) => row.eligible && !row.already_registered && row.cohort_subject !== null,
  );
  const togglePreview = () => {
    if (!showMissing) {
      setSelectedMissing(
        Object.fromEntries(
          actionableRows.map((row) => [
            row.cohort_subject as number,
            row.auto_selected_instructor?.id,
          ]),
        ),
      );
    }
    setShowMissing((visible) => !visible);
  };

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
      <Card className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium theme-text">Overall project progress</span>
          <span className="theme-muted">
            {project.progress.completed_stream_task_count} of{' '}
            {project.progress.expected_stream_task_count} stream tasks complete
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-gray-200">
          <div
            className="h-full bg-blue-600"
            style={{ width: `${project.progress.percentage}%` }}
          />
        </div>
      </Card>
      {mutations.addMissingStreams.error ? (
        <AppErrorBanner
          error={resolveAppError(mutations.addMissingStreams.error, {
            domain: 'projects',
            action: 'create',
            entityLabel: 'missing streams',
          })}
        />
      ) : null}
      {mutations.reopenLateEvidence.error ? (
        <AppErrorBanner
          error={resolveAppError(mutations.reopenLateEvidence.error, {
            domain: 'projects',
            action: 'update',
            entityLabel: 'late evidence window',
          })}
        />
      ) : null}
      {missing.error ? (
        <AppErrorBanner
          error={resolveAppError(missing.error, {
            domain: 'projects',
            action: 'load',
            entityLabel: 'missing streams',
          })}
          onAction={() => void missing.refetch()}
        />
      ) : null}
      {canReconcile && previewRows.length > 0 ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium theme-text">
              {actionableRows.length} eligible {actionableRows.length === 1 ? 'stream' : 'streams'}{' '}
              to reconcile
            </p>
            <Button onClick={togglePreview}>
              Preview stream reconciliation
            </Button>
          </div>
          {showMissing ? (
            <div className="space-y-3">
              {previewRows.map((row) => (
                <label
                  key={`${row.cohort_id}-${row.cohort_subject ?? 'unregistered'}`}
                  className="grid gap-2 rounded-lg border theme-border p-3 sm:grid-cols-[auto_1fr_14rem]"
                >
                  <input
                    type="checkbox"
                    disabled={
                      row.cohort_subject === null ||
                      !row.eligible ||
                      row.already_registered ||
                      !row.eligible_instructors.length
                    }
                    checked={
                      row.cohort_subject !== null &&
                      Object.hasOwn(selectedMissing, row.cohort_subject)
                    }
                    onChange={(event) =>
                      setSelectedMissing((current) => {
                        const next = { ...current };
                        if (row.cohort_subject === null) return next;
                        if (event.target.checked)
                          next[row.cohort_subject] = row.auto_selected_instructor?.id;
                        else delete next[row.cohort_subject];
                        return next;
                      })
                    }
                  />
                  <span>
                    <strong className="theme-text">{row.stream_name}</strong>
                    <span className="block text-sm theme-muted">
                      {row.subject_name} · {row.participant_count} participating learners
                    </span>
                    <span className="block text-sm theme-muted">{row.message}</span>
                    {row.warnings.map((warning) => (
                      <span key={warning.code} className="block text-sm text-amber-700">
                        {warning.message}
                      </span>
                    ))}
                  </span>
                  {row.eligible && !row.already_registered && row.requires_instructor_selection ? (
                    <Select
                      aria-label={`Teacher for ${row.stream_name}`}
                      value={selectedMissing[row.cohort_subject ?? 0] ?? ''}
                      onChange={(event) =>
                        setSelectedMissing((current) => ({
                          ...current,
                          [row.cohort_subject ?? 0]: Number(event.target.value),
                        }))
                      }
                      options={[
                        { value: '', label: 'Select teacher' },
                        ...row.eligible_instructors.map((teacher) => ({
                          value: teacher.id,
                          label: teacher.name,
                        })),
                      ]}
                    />
                  ) : (
                    <span className="text-sm theme-muted">
                      {row.already_registered
                        ? 'Already registered'
                        : row.auto_selected_instructor?.name ?? 'Needs attention'}
                    </span>
                  )}
                </label>
              ))}
              <div className="flex justify-end">
                <Button
                  disabled={
                    mutations.addMissingStreams.isPending ||
                    !Object.keys(selectedMissing).length ||
                    Object.entries(selectedMissing).some(
                      ([id, teacher]) =>
                        previewRows.find((row) => row.cohort_subject === Number(id))
                          ?.requires_instructor_selection && !teacher,
                    )
                  }
                  onClick={() =>
                    void mutations.addMissingStreams
                      .mutateAsync(
                        Object.entries(selectedMissing).map(([cohortSubject, instructor]) => ({
                          cohort_subject: Number(cohortSubject),
                          administering_instructor: instructor,
                        })),
                      )
                      .then(() => {
                        setSelectedMissing({});
                        setShowMissing(false);
                      })
                  }
                >
                  {mutations.addMissingStreams.isPending
                    ? 'Adding streams…'
                    : `Reconcile ${Object.keys(selectedMissing).length} streams`}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
      {canReconcile && !missing.isLoading && !missing.error && previewRows.length === 0 ? (
        <Card>
          <p className="font-medium theme-text">All eligible streams are set up</p>
          <p className="mt-1 text-sm theme-muted">
            No missing project streams need reconciliation.
          </p>
        </Card>
      ) : null}
      {project.deployments.some((row) => row.authority?.can_reopen_for_late_evidence) ? (
        <Card className="space-y-3">
          <div className="flex justify-between gap-3">
            <p className="font-medium theme-text">Late evidence</p>
            <Button variant="secondary" onClick={() => setShowReopen((value) => !value)}>
              Reopen expired streams
            </Button>
          </div>
          {showReopen ? (
            <div className="space-y-3">
              {project.deployments
                .filter((row) => row.authority?.can_reopen_for_late_evidence)
                .map((row) => (
                  <label key={row.id} className="flex gap-2 text-sm theme-text">
                    <input
                      type="checkbox"
                      checked={selectedExpired.includes(row.id)}
                      onChange={(event) =>
                        setSelectedExpired((current) =>
                          event.target.checked
                            ? [...current, row.id]
                            : current.filter((id) => id !== row.id),
                        )
                      }
                    />
                    {row.cohort.name}
                  </label>
                ))}
              <Input
                label="Reason"
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <Input
                label="Reopening closes at"
                type="datetime-local"
                required
                value={closesAt}
                onChange={(event) => setClosesAt(event.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  disabled={
                    !selectedExpired.length ||
                    !reason.trim() ||
                    !closesAt ||
                    mutations.reopenLateEvidence.isPending
                  }
                  onClick={() =>
                    void mutations.reopenLateEvidence
                      .mutateAsync({
                        deployments: selectedExpired,
                        reason,
                        closes_at: new Date(closesAt).toISOString(),
                      })
                      .then(() => {
                        setShowReopen(false);
                        setSelectedExpired([]);
                        setReason('');
                        setClosesAt('');
                      })
                  }
                >
                  {mutations.reopenLateEvidence.isPending
                    ? 'Reopening…'
                    : `Reopen ${selectedExpired.length} streams`}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
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
            <div className="space-y-3 text-sm">
              <Metric
                label="Tasks"
                value={`${deployment.progress.completed_task_count}/${deployment.progress.task_count}`}
              />
              <Coverage
                label="Evidence collected"
                coverage={deployment.progress.evidence_coverage}
              />
              <Coverage
                label="Evaluations finalized"
                coverage={deployment.progress.evaluation_coverage}
              />
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

function Coverage({
  label,
  coverage,
}: {
  label: string;
  coverage: { covered: number; expected: number; percentage: number };
}) {
  return (
    <div>
      <div className="flex justify-between">
        <span className="theme-subtle">{label}</span>
        <span className="theme-text">
          {coverage.covered} / {coverage.expected} · {coverage.percentage}%
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-gray-200">
        <div className="h-full bg-blue-600" style={{ width: `${coverage.percentage}%` }} />
      </div>
    </div>
  );
}
