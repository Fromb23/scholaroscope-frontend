'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import type {
  ProjectDeployment,
  ProjectGroup,
  ProjectParticipant,
  ProjectTaskEvaluation,
} from '@/app/core/types/projects';

interface FormProps {
  project: ProjectDeployment;
  participants: ProjectParticipant[];
  groups: ProjectGroup[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

function taskOptions(project: ProjectDeployment) {
  return [
    { value: '', label: 'Select task' },
    ...(project.definition?.tasks ?? []).map((task) => ({
      value: task.id,
      label: `${task.code}. ${task.title}`,
    })),
  ];
}

export function ProjectEvidenceForm({
  project,
  participants,
  groups,
  pending,
  onCancel,
  onSubmit,
}: FormProps) {
  const [task, setTask] = useState('');
  const [participant, setParticipant] = useState('');
  const [group, setGroup] = useState('');
  const [evidenceType, setEvidenceType] = useState('TEACHER_OBSERVATION');
  const [observation, setObservation] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    return void onSubmit({
      task: Number(task),
      participant: participant ? Number(participant) : undefined,
      group: group ? Number(group) : undefined,
      evidence_type: evidenceType,
      observed_at: new Date().toISOString(),
      structured_observation: { note: observation },
    }).catch(() => undefined);
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <Select
        label="Task"
        required
        value={task}
        onChange={(event) => setTask(event.target.value)}
        options={taskOptions(project)}
      />
      <Select
        label="Participant"
        value={participant}
        onChange={(event) => {
          setParticipant(event.target.value);
          if (event.target.value) setGroup('');
        }}
        options={[
          { value: '', label: 'No individual participant' },
          ...participants.map((item) => ({ value: item.id, label: item.learner_name })),
        ]}
      />
      <Select
        label="Group"
        value={group}
        onChange={(event) => {
          setGroup(event.target.value);
          if (event.target.value) setParticipant('');
        }}
        options={[
          { value: '', label: 'No group' },
          ...groups.map((item) => ({ value: item.id, label: item.name })),
        ]}
      />
      <Select
        label="Evidence type"
        required
        value={evidenceType}
        onChange={(event) => setEvidenceType(event.target.value)}
        options={[
          'TEACHER_OBSERVATION',
          'INDIVIDUAL_CONTRIBUTION',
          'LIVE_DEMONSTRATION',
          'DOCUMENT',
          'OTHER_FILE',
        ].map((value) => ({ value, label: value.replaceAll('_', ' ') }))}
      />
      <label className="block text-sm font-medium theme-text">
        Observation
        <textarea
          className="theme-input mt-1 min-h-28 w-full rounded-lg px-4 py-2"
          required
          value={observation}
          onChange={(event) => setObservation(event.target.value)}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !task || !observation.trim()}>
          {pending ? 'Recording…' : 'Record evidence'}
        </Button>
      </div>
    </form>
  );
}

export function ProjectEvaluationForm({
  project,
  participants,
  pending,
  onCancel,
  onSubmit,
}: FormProps) {
  const [task, setTask] = useState('');
  const [participant, setParticipant] = useState('');
  const [feedback, setFeedback] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    return void onSubmit({
      task: Number(task),
      participant: Number(participant),
      observed_at: new Date().toISOString(),
      teacher_feedback: feedback,
    }).catch(() => undefined);
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <Select
        label="Task"
        required
        value={task}
        onChange={(event) => setTask(event.target.value)}
        options={taskOptions(project)}
      />
      <Select
        label="Participant"
        required
        value={participant}
        onChange={(event) => setParticipant(event.target.value)}
        options={[
          { value: '', label: 'Select participant' },
          ...participants
            .filter((item) => item.status === 'ACTIVE')
            .map((item) => ({ value: item.id, label: item.learner_name })),
        ]}
      />
      <label className="block text-sm font-medium theme-text">
        Teacher feedback
        <textarea
          className="theme-input mt-1 min-h-28 w-full rounded-lg px-4 py-2"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !task || !participant}>
          {pending ? 'Creating…' : 'Create evaluation'}
        </Button>
      </div>
    </form>
  );
}

export function ProjectCriteriaForm({
  project,
  evaluation,
  pending,
  onCancel,
  onSubmit,
}: {
  project: ProjectDeployment;
  evaluation: ProjectTaskEvaluation;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (scores: Array<{ criterion: number; awarded_marks: string }>) => Promise<void>;
}) {
  const task = project.definition?.tasks.find((item) => item.id === evaluation.task);
  const [scores, setScores] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      evaluation.criterion_scores.map((item) => [item.criterion, item.awarded_marks]),
    ),
  );
  const criteria = task?.criteria ?? [];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    return void onSubmit(
      criteria.map((criterion) => ({
        criterion: criterion.id,
        awarded_marks: scores[criterion.id] ?? '',
      })),
    ).catch(() => undefined);
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm theme-muted">
        Each score is validated against the criterion maximum by the server.
      </p>
      {criteria.map((criterion) => (
        <div
          key={criterion.id}
          className="grid gap-2 rounded-lg border theme-border p-3 sm:grid-cols-[1fr_9rem]"
        >
          <div>
            <p className="font-medium theme-text">
              {criterion.code} · {criterion.description}
            </p>
            <p className="text-xs theme-subtle">Maximum {criterion.maximum_marks}</p>
          </div>
          <input
            className="theme-input rounded-lg px-3 py-2"
            type="number"
            min="0"
            max={criterion.maximum_marks}
            step="0.01"
            required
            value={scores[criterion.id] ?? ''}
            onChange={(event) =>
              setScores((current) => ({ ...current, [criterion.id]: event.target.value }))
            }
            aria-label={`Marks for ${criterion.code}`}
          />
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            pending || !criteria.length || criteria.some((criterion) => !scores[criterion.id])
          }
        >
          {pending ? 'Saving…' : 'Save criterion scores'}
        </Button>
      </div>
    </form>
  );
}
