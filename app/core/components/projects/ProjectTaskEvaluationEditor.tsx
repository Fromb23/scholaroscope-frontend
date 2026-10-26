'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/Button';
import type {
  ProjectEvidence,
  ProjectGroup,
  ProjectParticipant,
  ProjectTask,
  ProjectTaskEvaluation,
} from '@/app/core/types/projects';

type EvaluationScope = 'individual' | 'group';
type EvaluationDraft = { feedback: string; scores: Record<number, string> };
export type TaskEvaluationPayload = {
  task: number;
  participant: number;
  source_group?: number;
  observed_at: string;
  teacher_feedback: string;
  criterion_scores: Array<{ criterion: number; awarded_marks: string }>;
  evidence_ids: number[];
};

const emptyDraft = (): EvaluationDraft => ({ feedback: '', scores: {} });
const noEvidence: ProjectEvidence[] = [];
const noEvaluations: ProjectTaskEvaluation[] = [];

function replaceEvaluationRoute(
  deploymentId: number,
  update: (params: URLSearchParams) => void,
) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  update(params);
  window.history.replaceState(
    window.history.state,
    '',
    `/projects/${deploymentId}?${params.toString()}`,
  );
}

export function ProjectTaskEvaluationEditor({
  deploymentId,
  task,
  participants,
  groups,
  evidence = noEvidence,
  evaluations = noEvaluations,
  pending,
  onCancel,
  onSubmit,
  onFinalize = async () => undefined,
}: {
  deploymentId: number;
  task: ProjectTask;
  participants: ProjectParticipant[];
  groups: ProjectGroup[];
  evidence?: ProjectEvidence[];
  evaluations?: ProjectTaskEvaluation[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payloads: TaskEvaluationPayload[]) => Promise<void>;
  onFinalize?: (evaluation: ProjectTaskEvaluation) => Promise<void>;
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
        [...group.members, ...(group.historical_members ?? [])].some(
          (member) => activeParticipantIds.has(member.participant),
        ),
      ),
    [activeParticipantIds, groups],
  );
  const routeScope =
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('scope');
  const [scope, setScope] = useState<EvaluationScope>(routeScope === 'group' ? 'group' : 'individual');
  const [participantIndex, setParticipantIndex] = useState(() => {
    const requestedParticipant = Number(
      typeof window === 'undefined'
        ? null
        : new URLSearchParams(window.location.search).get('participant'),
    );
    const requestedIndex = activeParticipants.findIndex(
      (participant) => participant.id === requestedParticipant,
    );
    return requestedIndex >= 0 ? requestedIndex : 0;
  });
  const [groupIndex, setGroupIndex] = useState(() => {
    const requestedGroup = Number(
      typeof window === 'undefined'
        ? null
        : new URLSearchParams(window.location.search).get('group'),
    );
    const requestedIndex = availableGroups.findIndex((group) => group.id === requestedGroup);
    return requestedIndex >= 0 ? requestedIndex : 0;
  });
  const [participantDrafts, setParticipantDrafts] = useState<Record<number, EvaluationDraft>>({});
  const [groupDrafts, setGroupDrafts] = useState<Record<number, EvaluationDraft>>({});
  const [selectedEvidence, setSelectedEvidence] = useState<Record<number, number[]>>({});
  const [isDirty, setIsDirty] = useState(false);
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

  useEffect(() => {
    const restored: Record<number, EvaluationDraft> = {};
    const linked: Record<number, number[]> = {};
    evaluations.forEach((evaluation) => {
      restored[evaluation.participant] = {
        feedback: evaluation.teacher_feedback,
        scores: Object.fromEntries(
          evaluation.criterion_scores.map((score) => [score.criterion, score.awarded_marks]),
        ),
      };
      linked[evaluation.participant] = evaluation.evidence_ids;
    });
    setParticipantDrafts((current) => ({ ...restored, ...current }));
    setSelectedEvidence((current) => ({ ...linked, ...current }));
  }, [evaluations]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  useEffect(() => {
    if (scope !== 'group' || !availableGroups.length || typeof window === 'undefined') return;
    const requestedGroup = Number(new URLSearchParams(window.location.search).get('group'));
    const requestedIndex = availableGroups.findIndex((group) => group.id === requestedGroup);
    if (requestedIndex >= 0) setGroupIndex(requestedIndex);
  }, [availableGroups, scope]);

  const updateDraft = (change: Partial<EvaluationDraft>) => {
    if (!target) return;
    setIsDirty(true);
    const update = (current: Record<number, EvaluationDraft>) => ({
      ...current,
      [target.id]: { ...(current[target.id] ?? emptyDraft()), ...change },
    });
    if (scope === 'individual') setParticipantDrafts(update);
    else setGroupDrafts(update);
  };

  const move = (offset: number) => {
    if (scope === 'individual') {
      const nextIndex = participantIndex + offset;
      setParticipantIndex(nextIndex);
      const nextParticipant = activeParticipants[nextIndex];
      if (nextParticipant) {
        replaceEvaluationRoute(deploymentId, (params) => {
          params.set('scope', 'individual');
          params.set('participant', String(nextParticipant.id));
          params.delete('group');
        });
      }
    } else {
      const nextIndex = groupIndex + offset;
      setGroupIndex(nextIndex);
      const nextGroup = availableGroups[nextIndex];
      if (nextGroup) {
        replaceEvaluationRoute(deploymentId, (params) => {
          params.set('scope', 'group');
          params.set('group', String(nextGroup.id));
        });
      }
    }
  };

  const buildPayloads = () => {
    const observedAt = new Date().toISOString();
    const payloads = new Map<number, TaskEvaluationPayload>();
    for (const [targetId, value] of prepared) {
      const participantIds =
        scope === 'individual'
          ? [Number(targetId)]
          : [
              ...(availableGroups.find((group) => group.id === Number(targetId))?.members ?? []),
              ...(availableGroups.find((group) => group.id === Number(targetId))
                ?.historical_members ?? []),
            ]
              .filter(
                (member) => activeParticipantIds.has(member.participant),
              )
              .map((member) => member.participant);
      for (const participant of participantIds) {
        payloads.set(participant, {
          task: task.id,
          participant,
          ...(scope === 'group' ? { source_group: Number(targetId) } : {}),
          observed_at: observedAt,
          teacher_feedback: value.feedback.trim(),
          criterion_scores: task.criteria.map((criterion) => ({
            criterion: criterion.id,
            awarded_marks: value.scores[criterion.id],
          })),
          evidence_ids: selectedEvidence[
            scope === 'group' ? -Number(targetId) : participant
          ] ?? [],
        });
      }
    }
    return [...payloads.values()];
  };

  const payloads = buildPayloads();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit(payloads).then(() => setIsDirty(false)).catch(() => undefined);
  };

  const isParticipant = scope === 'individual' && target && 'learner_name' in target;
  const targetName = target
    ? isParticipant
      ? target.learner_name
      : 'name' in target
        ? target.name
        : ''
    : '';
  const currentParticipant = scope === 'individual' && target ? Number(target.id) : null;
  const currentEvidenceKey = target
    ? scope === 'group'
      ? -Number(target.id)
      : Number(target.id)
    : null;
  const currentEvaluation = evaluations.find(
    (evaluation) => evaluation.participant === currentParticipant,
  );
  const relevantEvidence = evidence.filter((item) =>
    scope === 'group'
      ? item.group === Number(target?.id)
      : item.learner ===
          activeParticipants.find((row) => row.id === currentParticipant)?.learner ||
        Boolean(currentParticipant && item.attributed_participants.includes(currentParticipant)),
  );

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
            onClick={() => {
              setScope('individual');
              replaceEvaluationRoute(deploymentId, (params) => {
                params.set('scope', 'individual');
                params.delete('group');
              });
            }}
          >
            Individual learners
          </Button>
          <Button
            type="button"
            variant={scope === 'group' ? 'primary' : 'secondary'}
            onClick={() => {
              setScope('group');
              replaceEvaluationRoute(deploymentId, (params) => {
                params.set('scope', 'group');
                if (availableGroups[groupIndex]) {
                  params.set('group', String(availableGroups[groupIndex].id));
                }
              });
            }}
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
                href={`/projects/${deploymentId}/groups/${target.id}?${new URLSearchParams({
                  returnTo: `/projects/${deploymentId}?tab=tasks&task=${task.id}&scope=group&group=${target.id}&section=evaluation`,
                }).toString()}`}
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
                {criterion.score_type === 'DISCRETE' ? (
                  <select
                    className="theme-input mt-1 w-full rounded-lg px-3 py-2"
                    value={draft.scores[criterion.id] ?? ''}
                    onChange={(event) => updateDraft({ scores: { ...draft.scores, [criterion.id]: event.target.value } })}
                  >
                    <option value="">Choose rubric outcome</option>
                    {criterion.score_options.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label ?? option.value}{option.description ? ` — ${option.description}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="theme-input mt-1 w-full rounded-lg px-3 py-2"
                    type="number" min="0" max={criterion.maximum_marks} step="0.01"
                    value={draft.scores[criterion.id] ?? ''}
                    onChange={(event) => updateDraft({ scores: { ...draft.scores, [criterion.id]: event.target.value } })}
                  />
                )}
              </label>
            ))}
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium theme-text">
              Supporting evidence ({relevantEvidence.length})
            </legend>
            {relevantEvidence.map((item) => (
              <label key={item.id} className="flex gap-2 text-sm theme-muted">
                <input
                  type="checkbox"
                  disabled={!item.officially_eligible || currentEvidenceKey === null}
                  checked={Boolean(currentEvidenceKey !== null && (selectedEvidence[currentEvidenceKey] ?? []).includes(item.id))}
                  onChange={(event) => {
                    if (currentEvidenceKey === null) return;
                    const current = selectedEvidence[currentEvidenceKey] ?? [];
                    setSelectedEvidence((all) => ({
                      ...all,
                      [currentEvidenceKey]: event.target.checked
                        ? [...new Set([...current, item.id])]
                        : current.filter((id) => id !== item.id),
                    }));
                    setIsDirty(true);
                  }}
                />
                Evidence #{item.id} · {item.late_state.replaceAll('_', ' ')}
                {!item.officially_eligible ? ' · not eligible for finalization' : ''}
              </label>
            ))}
          </fieldset>
          <p className="text-sm theme-muted">
            Status: {currentEvaluation?.status ?? 'Not yet saved'} · Projection:{' '}
            {currentEvaluation?.evidence_projection_status ?? 'Not projected'} · Running total:{' '}
            {Object.values(draft.scores).reduce((total, score) => total + Number(score || 0), 0)} / {task.maximum_marks}
          </p>
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
            : `Save draft${payloads.length > 1 ? `s (${payloads.length})` : ''}`}
        </Button>
        {scope === 'individual' && currentParticipant && index + 1 < targets.length ? (
          <Button
            type="button"
            disabled={pending || task.criteria.some((criterion) => !draft.scores[criterion.id])}
            onClick={() => {
              const currentPayload = payloads.find((payload) => payload.participant === currentParticipant);
              if (currentPayload)
                void onSubmit([currentPayload]).then(() => {
                  setIsDirty(false);
                  move(1);
                }).catch(() => undefined);
            }}
          >
            Save &amp; next
          </Button>
        ) : null}
        {currentEvaluation?.status === 'DRAFT' ? (
          <Button
            type="button"
            disabled={pending || incomplete}
            onClick={() => {
              if (window.confirm('Finalize this evaluation? Scores and linked evidence will be locked and CBC projection may begin.'))
                void onFinalize(currentEvaluation);
            }}
          >
            Finalize evaluation
          </Button>
        ) : null}
      </div>
    </form>
  );
}
