import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import type { ProjectDeployment, ProjectTask } from '@/app/core/types/projects';

function OutcomeList({ mappings }: { mappings: Array<Record<string, unknown>> }) {
  if (!mappings.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="font-semibold theme-text">Targeted curriculum outcomes</h3>
      {mappings.map((mapping, index) => {
        const snapshot = (mapping.reference_snapshot ?? {}) as {
          code?: string;
          description?: string;
        };
        const code = snapshot.code ?? String(mapping.reference_id ?? 'Outcome');
        return (
          <div
            key={`${String(mapping.reference_id)}-${index}`}
            className="rounded-lg theme-surface-elevated p-3 text-sm"
          >
            <p className="font-medium theme-text">{code}</p>
            <p className="theme-muted">
              {snapshot.description ?? 'Outcome description unavailable'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function ProjectTaskWorkspace({
  project,
  task,
  taskIndex,
  onPrevious,
  onNext,
  onRecordEvidence,
  onStartTask,
  onEvaluate,
  activating = false,
}: {
  project: ProjectDeployment;
  task: ProjectTask;
  taskIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onRecordEvidence: () => void;
  onStartTask: () => void;
  onEvaluate: () => void;
  activating?: boolean;
}) {
  const tasks = project.definition?.tasks ?? [];
  const execution = project.task_executions?.find((item) => item.task === task.id);
  const authority = execution?.authority;
  const reasonCodes = execution?.blocked_reason_codes ?? authority?.blocked_reason_codes ?? {};
  const structurallyDenied = (action: 'activate' | 'record_evidence' | 'evaluate') =>
    ['PERMISSION_DENIED', 'NOT_RESPONSIBLE_INSTRUCTOR'].includes(reasonCodes[action] ?? '');
  const canStartState = execution?.status === 'AVAILABLE' || execution?.status === 'PENDING';
  const canWriteState = ['ACTIVE', 'SUBMITTED', 'EVALUATED'].includes(execution?.status ?? '');
  return (
    <Card className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" disabled={taskIndex === 0} onClick={onPrevious}>
          Previous task
        </Button>
        <span className="text-sm font-medium theme-muted">
          Task {taskIndex + 1} of {tasks.length}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={taskIndex + 1 >= tasks.length}
          onClick={onNext}
        >
          Next task
        </Button>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm theme-subtle">{task.code}</p>
          <h2 className="text-xl font-semibold theme-text">{task.title}</h2>
        </div>
        <div className="flex gap-2">
          <Badge>{task.maximum_marks} marks</Badge>
          <Badge variant="info">{execution?.status ?? 'Not started'}</Badge>
        </div>
      </div>
      <p className="whitespace-pre-wrap theme-muted">{task.instructions}</p>
      {execution ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Coverage label="Evidence collected" coverage={execution.evidence_coverage} />
          <Coverage label="Evaluations finalized" coverage={execution.evaluation_coverage} />
        </div>
      ) : null}
      {task.steps.length ? (
        <div className="space-y-2">
          <h3 className="font-semibold theme-text">Task steps</h3>
          {task.steps.map((step) => (
            <div key={step.id} className="rounded-lg border theme-border p-3">
              <p className="font-medium theme-text">
                {step.number} {step.title}
              </p>
              <p className="text-sm theme-muted">{step.instructions}</p>
            </div>
          ))}
        </div>
      ) : null}
      <OutcomeList mappings={task.curriculum_mappings} />
      <div className="space-y-2">
        <h3 className="font-semibold theme-text">Criteria and scoring guide</h3>
        {task.criteria.map((criterion) => (
          <div key={criterion.id} className="rounded-lg border theme-border p-3 text-sm">
            <div className="flex justify-between gap-3">
              <strong>
                {criterion.code} · {criterion.description}
              </strong>
              <span>{criterion.maximum_marks} marks</span>
            </div>
            {criterion.curriculum_mappings.map((mapping) => (
              <p key={`${criterion.id}-${mapping.reference_id}`} className="mt-1 theme-muted">
                {mapping.reference_snapshot.code ?? mapping.reference_id}:{' '}
                {mapping.reference_snapshot.description ?? 'Outcome description unavailable'}
              </p>
            ))}
          </div>
        ))}
      </div>
      {execution && execution.status !== 'FINALIZED' ? (
        <div className="space-y-2 border-t theme-border pt-4">
          <div className="flex flex-wrap justify-end gap-2">
            {canStartState && !structurallyDenied('activate') ? (
              <Button disabled={!authority?.can_activate || activating} onClick={onStartTask}>
                {activating ? 'Starting…' : 'Start task'}
              </Button>
            ) : null}
            {canWriteState && !structurallyDenied('record_evidence') ? (
              <Button disabled={!authority?.can_record_evidence} onClick={onRecordEvidence}>
                Record evidence
              </Button>
            ) : null}
            {canWriteState && !structurallyDenied('evaluate') ? (
              <Button variant="secondary" disabled={!authority?.can_evaluate} onClick={onEvaluate}>
                Evaluate task
              </Button>
            ) : null}
          </div>
          {canStartState && !authority?.can_activate && !structurallyDenied('activate') ? (
            <p className="text-right text-sm theme-muted">{blockedReason(reasonCodes.activate)}</p>
          ) : null}
          {canWriteState &&
          !authority?.can_record_evidence &&
          !structurallyDenied('record_evidence') ? (
            <p className="text-right text-sm theme-muted">
              {blockedReason(reasonCodes.record_evidence)}
            </p>
          ) : null}
          {canWriteState && !authority?.can_evaluate && !structurallyDenied('evaluate') ? (
            <p className="text-right text-sm theme-muted">{blockedReason(reasonCodes.evaluate)}</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function blockedReason(code?: string) {
  const reasons: Record<string, string> = {
    PROJECT_NOT_ACTIVE: 'Start the project before working on this task.',
    TASK_NOT_ACTIVE: 'Start this task before recording evidence or evaluating learners.',
    TASK_DEPENDENCY_INCOMPLETE: 'Complete and finalize the prerequisite task first.',
    EVIDENCE_WINDOW_CLOSED:
      'The evidence deadline has closed. Ask an Access or Workspace Administrator to reopen late evidence.',
    TASK_FINALIZED: 'This task is finalized and is now read-only.',
  };
  return reasons[code ?? ''] ?? 'This action is not currently available.';
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
      <div className="flex justify-between text-sm">
        <span className="theme-muted">{label}</span>
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
