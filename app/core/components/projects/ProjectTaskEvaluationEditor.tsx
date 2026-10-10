'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/Button';
import type { ProjectGroup, ProjectParticipant, ProjectTask } from '@/app/core/types/projects';

type EvaluationScope = 'individual' | 'group';
type EvaluationDraft = { feedback: string; scores: Record<number, string> };
export type TaskEvaluationPayload = {
  task: number;
  participant: number;
  observed_at: string;
  teacher_feedback: string;
  criterion_scores: Array<{ criterion: number; awarded_marks: string }>;
};

const emptyDraft = (): EvaluationDraft => ({ feedback: '', scores: {} });

export function ProjectTaskEvaluationEditor({
  deploymentId,
  task,
  participants,
  groups,
  pending,
  onCancel,
  onSubmit,
}: {
  deploymentId: number;
  task: ProjectTask;
  participants: ProjectParticipant[];
  groups: ProjectGroup[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payloads: TaskEvaluationPayload[]) => Promise<void>;
}) {
  const activeParticipants = useMemo(
    () => participants.filter((item) => item.status === 'ACTIVE'),
    [participants],
  );
  const activeParticipantIds = useMemo(
    () => new Set(activeParticipants.map((participant) => participant.id)),
    [activeParticipants],
  );
  const availableGroups = useMemo(
    () =>
      groups.filter((group) =>
        group.members.some(
          (member) =>
            member.participation_status === 'ACTIVE' &&
            activeParticipantIds.has(member.participant),
        ),
      ),
    [activeParticipantIds, groups],
  );
  const [scope, setScope] = useState<EvaluationScope>('individual');
  const [participantIndex, setParticipantIndex] = useState(0);
  const [groupIndex, setGroupIndex] = useState(0);
  const [participantDrafts, setParticipantDrafts] = useState<Record<number, EvaluationDraft>>({});
  const [groupDrafts, setGroupDrafts] = useState<Record<number, EvaluationDraft>>({});
  const targets = scope === 'individual' ? activeParticipants : availableGroups;
  const index = scope === 'individual' ? participantIndex : groupIndex;
  const target = targets[index];
  const drafts = scope === 'individual' ? participantDrafts : groupDrafts;
  const draft = target ? (drafts[target.id] ?? emptyDraft()) : emptyDraft();
  const prepared = Object.entries(drafts).filter(
    ([, value]) => value.feedback.trim() || Object.values(value.scores).some(Boolean),
  );
  const incomplete = prepared.some(([, value]) =>
    task.criteria.some((criterion) => !value.scores[criterion.id]),
  );

  const updateDraft = (change: Partial<EvaluationDraft>) => {
    if (!target) return;
    const update = (current: Record<number, EvaluationDraft>) => ({
      ...current,
      [target.id]: { ...(current[target.id] ?? emptyDraft()), ...change },
    });
    if (scope === 'individual') setParticipantDrafts(update);
    else setGroupDrafts(update);
  };

  const move = (offset: number) => {
    if (scope === 'individual') setParticipantIndex((value) => value + offset);
    else setGroupIndex((value) => value + offset);
  };

  const buildPayloads = () => {
    const observedAt = new Date().toISOString();
    const payloads = new Map<number, TaskEvaluationPayload>();
    for (const [targetId, value] of prepared) {
      const participantIds =
        scope === 'individual'
          ? [Number(targetId)]
          : (availableGroups.find((group) => group.id === Number(targetId))?.members ?? [])
              .filter(
                (member) =>
                  member.participation_status === 'ACTIVE' &&
                  activeParticipantIds.has(member.participant),
              )
              .map((member) => member.participant);
      for (const participant of participantIds) {
        payloads.set(participant, {
          task: task.id,
          participant,
          observed_at: observedAt,
          teacher_feedback: value.feedback.trim(),
          criterion_scores: task.criteria.map((criterion) => ({
            criterion: criterion.id,
            awarded_marks: value.scores[criterion.id],
          })),
        });
      }
    }
    return [...payloads.values()];
  };

  const payloads = buildPayloads();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit(payloads).catch(() => undefined);
  };

  const isParticipant = scope === 'individual' && target && 'learner_name' in target;
  const targetName = target
    ? isParticipant
      ? target.learner_name
      : 'name' in target
        ? target.name
        : ''
    : '';

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="rounded-lg border theme-border p-3">
        <p className="text-xs theme-subtle">Current task</p>
        <p className="font-semibold theme-text">
          {task.code}: {task.title}
        </p>
        <p className="mt-1 text-sm theme-muted">{task.instructions}</p>
      </div>
      <div className="space-y-2">
        <p className="font-medium theme-text">Criteria and curriculum outcomes</p>
        {task.criteria.map((criterion) => (
          <div key={criterion.id} className="rounded-lg border theme-border p-3 text-sm">
            <strong>
              {criterion.code} · {criterion.description}
            </strong>
            <span className="ml-2 theme-muted">{criterion.maximum_marks} marks</span>
            {criterion.curriculum_mappings.map((mapping) => (
              <p key={mapping.reference_id} className="mt-1 theme-muted">
                {mapping.reference_snapshot.code ?? mapping.reference_id}:{' '}
                {mapping.reference_snapshot.description ?? 'Outcome description unavailable'}
              </p>
            ))}
          </div>
        ))}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium theme-text">Evaluate by</legend>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={scope === 'individual' ? 'primary' : 'secondary'}
            onClick={() => setScope('individual')}
          >
            Individual learners
          </Button>
          <Button
            type="button"
            variant={scope === 'group' ? 'primary' : 'secondary'}
            onClick={() => setScope('group')}
          >
            Groups
          </Button>
        </div>
      </fieldset>
      {target ? (
        <div className="space-y-3 rounded-lg border theme-border p-4">
          <div>
            <p className="font-semibold theme-text">{targetName}</p>
            <p className="text-sm theme-muted">
              {scope === 'individual' ? 'Learner' : 'Group'} {index + 1} of {targets.length}
            </p>
            {scope === 'group' ? (
              <Link
                className="text-sm text-blue-600 hover:underline"
                href={`/projects/${deploymentId}/groups/${target.id}`}
              >
                View group members
              </Link>
            ) : null}
          </div>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={index === 0}
              onClick={() => move(-1)}
            >
              Previous {scope === 'individual' ? 'learner' : 'group'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={index + 1 >= targets.length}
              onClick={() => move(1)}
            >
              Next {scope === 'individual' ? 'learner' : 'group'}
            </Button>
          </div>
          <label className="block text-sm font-medium theme-text">
            {scope === 'individual' ? 'Learner' : 'Group'} feedback
            <textarea
              className="theme-input mt-1 min-h-28 w-full rounded-lg px-4 py-2"
              value={draft.feedback}
              onChange={(event) => updateDraft({ feedback: event.target.value })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {task.criteria.map((criterion) => (
              <label key={criterion.id} className="text-sm font-medium theme-text">
                {criterion.code} marks (max {criterion.maximum_marks})
                <input
                  className="theme-input mt-1 w-full rounded-lg px-3 py-2"
                  type="number"
                  min="0"
                  max={criterion.maximum_marks}
                  step="0.01"
                  value={draft.scores[criterion.id] ?? ''}
                  onChange={(event) =>
                    updateDraft({
                      scores: { ...draft.scores, [criterion.id]: event.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm theme-muted">
          No active {scope === 'individual' ? 'learners' : 'groups'} are available for evaluation.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !payloads.length || incomplete}>
          {pending
            ? 'Saving…'
            : `Save ${payloads.length} ${payloads.length === 1 ? 'evaluation' : 'evaluations'}`}
        </Button>
      </div>
    </form>
  );
}
