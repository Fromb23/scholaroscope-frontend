'use client';

import { useMemo, useState } from 'react';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { useProjectCatchUpReview } from '@/app/core/hooks/useProjects';
import { resolveAppError } from '@/app/core/errors';
import type { ProjectCatchUpDisposition, ProjectParticipant } from '@/app/core/types/projects';

const dispositionOptions = [
  { value: '', label: 'Choose a disposition' },
  { value: 'CATCH_UP_WORK_PLANNED', label: 'Catch-up work planned' },
  { value: 'DIAGNOSTIC_ASSESSMENT_PLANNED', label: 'Diagnostic assessment planned' },
  { value: 'EXISTING_EVIDENCE_REVIEWED', label: 'Existing evidence reviewed' },
  { value: 'NO_ADDITIONAL_WORK', label: 'No additional work required' },
];

const instructionLabels: Record<string, string> = {
  TAUGHT_BEFORE_ADMISSION: 'Taught before admission',
  TAUGHT_WHILE_ELIGIBLE_EXPOSURE_UNCONFIRMED:
    'Taught while eligible; learner exposure is unconfirmed',
  CONFIRMED_EXPOSURE: 'Learner exposure confirmed',
  NOT_YET_TAUGHT: 'Not yet taught',
};

export function ProjectCatchUpReview({
  deploymentId,
  participant,
  canReview,
}: {
  deploymentId: number;
  participant: ProjectParticipant;
  canReview: boolean;
}) {
  const [open, setOpen] = useState(false);
  const workflow = useProjectCatchUpReview(deploymentId, open ? participant.id : null);
  const [disposition, setDisposition] = useState<ProjectCatchUpDisposition | ''>(
    participant.catch_up_disposition ?? '',
  );
  const [reason, setReason] = useState(participant.catch_up_reason ?? '');
  const [nextStep, setNextStep] = useState(participant.catch_up_next_step ?? '');
  const [assignmentRecipient, setAssignmentRecipient] = useState('');
  const [assessment, setAssessment] = useState('');
  const [evidenceIds, setEvidenceIds] = useState<number[]>(participant.catch_up_evidence_ids ?? []);
  const data = workflow.review.data;
  const availableEvidence = useMemo(
    () =>
      (data?.context.outcomes ?? []).flatMap((outcome) =>
        outcome.valid_evidence.map((evidence) => ({ ...evidence, outcome })),
      ),
    [data],
  );

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {participant.catch_up_status === 'RESOLVED'
          ? 'View project catch-up review'
          : 'Review project catch-up'}
      </Button>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold theme-text">
            Project catch-up review · {participant.learner_name}
          </h3>
          <p className="text-sm theme-muted">
            {data?.context.scope_message ?? 'Loading project-scoped learning context…'}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
      {workflow.review.isLoading ? <LoadingSpinner /> : null}
      {workflow.review.error ? (
        <AppErrorBanner
          error={resolveAppError(workflow.review.error, {
            domain: 'projects',
            action: 'load',
            entityLabel: 'project catch-up review',
          })}
        />
      ) : null}
      {workflow.save.error ? (
        <AppErrorBanner
          error={resolveAppError(workflow.save.error, {
            domain: 'projects',
            action: 'update',
            entityLabel: 'project catch-up review',
          })}
        />
      ) : null}
      {data ? (
        <>
          <p className="text-sm theme-muted">{data.context.prior_evidence_message}</p>
          {data.participant.catch_up_status === 'RESOLVED' ? (
            <section className="rounded-lg border theme-border p-3 text-sm">
              <p className="font-medium theme-text">Recorded project catch-up disposition</p>
              <p className="theme-muted">
                {data.participant.catch_up_disposition
                  ? data.participant.catch_up_disposition.replaceAll('_', ' ')
                  : 'Disposition unavailable'}
                {data.participant.catch_up_reviewer_name
                  ? ` · ${data.participant.catch_up_reviewer_name}`
                  : ''}
                {data.participant.catch_up_reviewed_at
                  ? ` · ${new Date(data.participant.catch_up_reviewed_at).toLocaleString()}`
                  : ''}
              </p>
              <p className="theme-muted">Reason: {data.participant.catch_up_reason}</p>
              <p className="theme-muted">Next step: {data.participant.catch_up_next_step}</p>
            </section>
          ) : null}
          <section className="space-y-2">
            <h4 className="font-medium theme-text">Mapped learning outcomes</h4>
            {data.context.outcomes.length ? (
              data.context.outcomes.map((outcome) => (
                <div key={outcome.id} className="rounded-lg border theme-border p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium theme-text">
                      {outcome.code} · {outcome.description}
                    </p>
                    <Badge>{instructionLabels[outcome.instruction_state]}</Badge>
                  </div>
                  <p className="mt-1 theme-muted">
                    Class coverage: {outcome.class_session_dates.join(', ') || 'None recorded'} ·
                    learner evidence: {outcome.valid_evidence.length || 'none available'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm theme-muted">
                No CBC learning outcomes are mapped to this project.
              </p>
            )}
          </section>
          <section className="space-y-2">
            <h4 className="font-medium theme-text">Project tasks</h4>
            {data.context.tasks.map((task) => (
              <p key={task.execution_id} className="text-sm theme-muted">
                {task.code} · {task.title} · {task.status}
                {task.started_before_admission ? ' · started before admission' : ''}
                {task.prospectively_admitted ? ' · prospectively admitted' : ''}
              </p>
            ))}
          </section>
          {canReview ? (
            <form
              className="space-y-3 border-t theme-border pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!disposition) return;
                workflow.save.mutate({
                  disposition,
                  reason,
                  next_step: nextStep,
                  assignment_recipient: assignmentRecipient
                    ? Number(assignmentRecipient)
                    : undefined,
                  assessment: assessment ? Number(assessment) : undefined,
                  evidence_ids: evidenceIds,
                });
              }}
            >
              <Select
                label="Review disposition"
                required
                value={disposition}
                onChange={(event) =>
                  setDisposition(event.target.value as ProjectCatchUpDisposition | '')
                }
                options={dispositionOptions}
              />
              {disposition === 'CATCH_UP_WORK_PLANNED' ? (
                <Select
                  label="Existing catch-up assignment"
                  required
                  value={assignmentRecipient}
                  onChange={(event) => setAssignmentRecipient(event.target.value)}
                  options={[
                    { value: '', label: 'Choose a catch-up assignment' },
                    ...data.context.catch_up_assignment_options.map((option) => ({
                      value: option.recipient_id,
                      label: `${option.title} · ${option.status}`,
                    })),
                  ]}
                />
              ) : null}
              {disposition === 'DIAGNOSTIC_ASSESSMENT_PLANNED' ? (
                <Select
                  label="Existing entry/diagnostic assessment"
                  required
                  value={assessment}
                  onChange={(event) => setAssessment(event.target.value)}
                  options={[
                    { value: '', label: 'Choose an entry assessment' },
                    ...data.context.diagnostic_assessment_options.map((option) => ({
                      value: option.id,
                      label: `${option.name} · ${option.status}`,
                    })),
                  ]}
                />
              ) : null}
              {disposition === 'EXISTING_EVIDENCE_REVIEWED' ? (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium theme-text">
                    Authorized existing evidence reviewed
                  </legend>
                  {availableEvidence.map((evidence) => (
                    <label key={evidence.id} className="flex gap-2 text-sm theme-muted">
                      <input
                        type="checkbox"
                        checked={evidenceIds.includes(evidence.id)}
                        onChange={(event) =>
                          setEvidenceIds((current) =>
                            event.target.checked
                              ? [...new Set([...current, evidence.id])]
                              : current.filter((id) => id !== evidence.id),
                          )
                        }
                      />
                      {evidence.outcome.code} · {evidence.source_type || 'source unavailable'} ·{' '}
                      {evidence.observed_at}
                    </label>
                  ))}
                  {!availableEvidence.length ? (
                    <p className="text-sm theme-muted">
                      No authorized existing evidence is available.
                    </p>
                  ) : null}
                </fieldset>
              ) : null}
              <Input
                label="Review reason"
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <Input
                label="Recorded next step"
                required
                value={nextStep}
                onChange={(event) => setNextStep(event.target.value)}
              />
              <Button
                type="submit"
                disabled={
                  !disposition || !reason.trim() || !nextStep.trim() || workflow.save.isPending
                }
              >
                {workflow.save.isPending ? 'Saving…' : 'Complete project catch-up review'}
              </Button>
            </form>
          ) : (
            <p className="text-sm theme-muted">You have read-only access to this project review.</p>
          )}
        </>
      ) : null}
    </Card>
  );
}
