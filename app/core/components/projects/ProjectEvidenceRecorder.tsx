'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import type {
  ProjectDeployment,
  ProjectGroup,
  ProjectParticipant,
  ProjectTask,
  ProjectEvidenceTypeContract,
} from '@/app/core/types/projects';

type Scope = 'individual' | 'group';
type Draft = { evidenceType: string; observation: string };

const EVIDENCE_TYPES: Record<Scope, Array<{ value: string; label: string }>> = {
  individual: [
    { value: 'TEACHER_OBSERVATION', label: 'Teacher observation' },
    { value: 'INDIVIDUAL_CONTRIBUTION', label: 'Individual contribution' },
    { value: 'INDIVIDUAL_ARTIFACT', label: 'Individual artifact' },
    { value: 'LIVE_DEMONSTRATION', label: 'Live demonstration' },
  ],
  group: [
    { value: 'GROUP_ARTIFACT', label: 'Group artifact' },
    { value: 'TEACHER_OBSERVATION', label: 'Group observation' },
    { value: 'LIVE_DEMONSTRATION', label: 'Live demonstration' },
  ],
};

type ItemFailure = {
  index: number;
  group?: number;
  participant?: number;
  code: string;
  message: string;
};

function batchFailures(error: unknown): ItemFailure[] {
  const candidate = error as {
    response?: { data?: { error?: { code?: string; context?: { items?: ItemFailure[] } } } };
  };
  if (candidate.response?.data?.error?.code !== 'project_evidence_batch_invalid') return [];
  return candidate.response.data.error.context?.items ?? [];
}

function replaceRecorderRoute(projectId: number, update: (params: URLSearchParams) => void) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.delete('returnTo');
  update(params);
  window.history.replaceState(window.history.state, '', `/projects/${projectId}?${params}`);
}

export function ProjectEvidenceRecorder({
  project,
  task,
  participants,
  groups,
  evidenceTypes,
  pending,
  onCancel,
  onScopeChange,
  onSubmit,
}: {
  project: ProjectDeployment;
  task: ProjectTask;
  participants: ProjectParticipant[];
  groups: ProjectGroup[];
  evidenceTypes?: ProjectEvidenceTypeContract;
  pending: boolean;
  onCancel: () => void;
  onScopeChange: () => void;
  onSubmit: (payload: { task: number; items: Array<Record<string, unknown>> }) => Promise<void>;
}) {
  const activeParticipants = useMemo(
    () => participants.filter((item) => item.status === 'ACTIVE'),
    [participants],
  );
  const initialScope =
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('scope');
  const [scope, setScope] = useState<Scope | null>(
    initialScope === 'individual' || initialScope === 'group' ? initialScope : null,
  );
  const [learnerIndex, setLearnerIndex] = useState(() => {
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
    const requestedIndex = groups.findIndex((group) => group.id === requestedGroup);
    return requestedIndex >= 0 ? requestedIndex : 0;
  });
  const [learnerDrafts, setLearnerDrafts] = useState<Record<number, Draft>>({});
  const [groupDrafts, setGroupDrafts] = useState<Record<number, Draft>>({});
  const [submissionScope, setSubmissionScope] = useState<'current' | 'all'>('current');
  const [itemFailures, setItemFailures] = useState<ItemFailure[]>([]);
  const items = scope === 'individual' ? activeParticipants : groups;
  const index = scope === 'individual' ? learnerIndex : groupIndex;
  const current = scope ? items[index] : undefined;
  const drafts = scope === 'individual' ? learnerDrafts : groupDrafts;
  const draft = current
    ? (drafts[current.id] ?? { evidenceType: 'TEACHER_OBSERVATION', observation: '' })
    : null;
  const prepared = Object.entries(drafts).filter(([, value]) => value.observation.trim());

  useEffect(() => {
    if (scope !== 'group' || !groups.length || typeof window === 'undefined') return;
    const requestedGroup = Number(new URLSearchParams(window.location.search).get('group'));
    const requestedIndex = groups.findIndex((group) => group.id === requestedGroup);
    if (requestedIndex >= 0) setGroupIndex(requestedIndex);
  }, [groups, scope]);

  const chooseScope = (next: Scope) => {
    setScope(next);
    replaceRecorderRoute(project.id, (params) => {
      params.set('scope', next);
      if (next === 'group') {
        params.delete('participant');
        if (groups[groupIndex]) params.set('group', String(groups[groupIndex].id));
      } else {
        params.delete('group');
        if (activeParticipants[learnerIndex]) {
          params.set('participant', String(activeParticipants[learnerIndex].id));
        }
      }
    });
    onScopeChange();
  };
  const updateDraft = (value: Partial<Draft>) => {
    if (!current || !draft) return;
    const next = { ...draft, ...value };
    if (scope === 'individual') {
      setLearnerDrafts((rows) => ({ ...rows, [current.id]: next }));
    } else {
      setGroupDrafts((rows) => ({ ...rows, [current.id]: next }));
    }
  };
  const move = (offset: number) => {
    if (scope === 'individual') {
      const nextIndex = learnerIndex + offset;
      setLearnerIndex(nextIndex);
      const nextParticipant = activeParticipants[nextIndex];
      if (nextParticipant) {
        replaceRecorderRoute(project.id, (params) => {
          params.set('scope', 'individual');
          params.set('participant', String(nextParticipant.id));
        });
      }
    } else {
      const nextIndex = groupIndex + offset;
      setGroupIndex(nextIndex);
      const nextGroup = groups[nextIndex];
      if (nextGroup) {
        replaceRecorderRoute(project.id, (params) => {
          params.set('scope', 'group');
          params.set('group', String(nextGroup.id));
        });
      }
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!scope || !prepared.length || !current) return;
    const selected =
      submissionScope === 'current'
        ? prepared.filter(([id]) => Number(id) === current.id)
        : prepared;
    if (!selected.length) return;
    setItemFailures([]);
    void onSubmit({
      task: task.id,
      items: selected.map(([id, value]) => ({
        [scope === 'individual' ? 'participant' : 'group']: Number(id),
        evidence_type: value.evidenceType,
        observed_at: new Date().toISOString(),
        structured_observation: { note: value.observation.trim() },
      })),
    }).catch((error) => setItemFailures(batchFailures(error)));
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="rounded-lg border theme-border p-3">
        <p className="text-xs theme-subtle">Task</p>
        <p className="font-semibold theme-text">
          {task.code}: {task.title}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm theme-muted">{task.instructions}</p>
        {task.steps.length ? (
          <div className="mt-3 space-y-1 text-sm theme-muted">
            <p className="font-medium theme-text">Steps</p>
            {task.steps.map((step) => (
              <p key={step.id}>
                {step.number} {step.title}: {step.instructions}
              </p>
            ))}
          </div>
        ) : null}
        {task.curriculum_mappings.length ? (
          <div className="mt-3 space-y-1 text-sm theme-muted">
            <p className="font-medium theme-text">Curriculum outcomes</p>
            {task.curriculum_mappings.map((mapping, index) => {
              const snapshot = (mapping.reference_snapshot ?? {}) as {
                code?: string;
                description?: string;
              };
              return (
                <p key={`${String(mapping.reference_id)}-${index}`}>
                  {snapshot.code ?? String(mapping.reference_id ?? 'Outcome')}:{' '}
                  {snapshot.description ?? 'Outcome description unavailable'}
                </p>
              );
            })}
          </div>
        ) : null}
        {task.criteria.length ? (
          <div className="mt-3 space-y-1 text-sm theme-muted">
            <p className="font-medium theme-text">Criteria</p>
            {task.criteria.map((criterion) => (
              <p key={criterion.id}>
                {criterion.code}: {criterion.description} ({criterion.maximum_marks} marks)
              </p>
            ))}
          </div>
        ) : null}
        {task.evidence_requirements.length ? (
          <div className="mt-3 space-y-1 text-sm theme-muted">
            <p className="font-medium theme-text">Evidence requirements</p>
            {task.evidence_requirements.map((requirement) => (
              <p key={requirement.id}>
                {requirement.evidence_type.replaceAll('_', ' ')}: {requirement.description}
                {requirement.required ? ' (required)' : ''}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium theme-text">Who is this evidence for?</legend>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={scope === 'individual' ? 'primary' : 'secondary'}
            onClick={() => chooseScope('individual')}
          >
            Individual learners
          </Button>
          <Button
            type="button"
            variant={scope === 'group' ? 'primary' : 'secondary'}
            onClick={() => chooseScope('group')}
          >
            Group
          </Button>
        </div>
      </fieldset>
      {scope && !current ? (
        <p className="text-sm theme-muted">
          No active {scope === 'individual' ? 'learners' : 'groups'} are available.
        </p>
      ) : null}
      {scope && current && draft ? (
        <div className="space-y-4 rounded-lg border theme-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold theme-text">
                {'learner_name' in current ? current.learner_name : current.name}
              </p>
              <p className="text-sm theme-muted">
                {scope === 'individual'
                  ? `Learner ${index + 1} of ${items.length}`
                  : `Group ${index + 1} of ${items.length}`}
              </p>
              {scope === 'group' ? (
                <Link
                  className="text-sm text-blue-600 hover:underline"
                  href={`/projects/${project.id}/groups/${current.id}?${new URLSearchParams({
                    returnTo: `/projects/${project.id}?tab=tasks&task=${task.id}&scope=group&group=${current.id}&section=evidence`,
                  }).toString()}`}
                >
                  View group members
                </Link>
              ) : null}
            </div>
            {draft.observation.trim() ? (
              <span className="text-xs text-green-700">Draft prepared</span>
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
              disabled={index + 1 >= items.length}
              onClick={() => move(1)}
            >
              Next {scope === 'individual' ? 'learner' : 'group'}
            </Button>
          </div>
          <Select
            label="Evidence type"
            required
            value={draft.evidenceType}
            onChange={(event) => updateDraft({ evidenceType: event.target.value })}
            options={(evidenceTypes ?? EVIDENCE_TYPES)[scope]}
          />
          <label className="block text-sm font-medium theme-text">
            Observation
            <textarea
              className="theme-input mt-1 min-h-28 w-full rounded-lg px-4 py-2"
              value={draft.observation}
              onChange={(event) => updateDraft({ observation: event.target.value })}
            />
          </label>
        </div>
      ) : null}
      {itemFailures.length ? (
        <div className="space-y-2" role="alert">
          {itemFailures.map((failure) => {
            const target = failure.group
              ? groups.find((group) => group.id === failure.group)?.name ?? `Group ${failure.group}`
              : activeParticipants.find((participant) => participant.id === failure.participant)
                  ?.learner_name ?? 'Learner';
            return (
              <p
                key={`${failure.index}-${failure.code}`}
                className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800"
              >
                {target}: {failure.message} ({failure.code})
              </p>
            );
          })}
        </div>
      ) : null}
      {prepared.length ? (
        <div className="rounded-lg border theme-border p-3" aria-label="Prepared evidence drafts">
          <p className="mb-2 text-sm font-medium theme-text">Prepared drafts</p>
          <div className="flex flex-wrap gap-2">
            {prepared.map(([id]) => {
              const numericId = Number(id);
              const preparedIndex = items.findIndex((item) => item.id === numericId);
              const preparedItem = items[preparedIndex];
              if (!preparedItem) return null;
              const preparedLabel =
                'learner_name' in preparedItem ? preparedItem.learner_name : preparedItem.name;
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={current?.id === numericId ? 'primary' : 'secondary'}
                  aria-label={`Open prepared draft for ${preparedLabel}`}
                  onClick={() => {
                    if (scope === 'individual') setLearnerIndex(preparedIndex);
                    else setGroupIndex(preparedIndex);
                    replaceRecorderRoute(project.id, (params) => {
                      params.set('scope', scope!);
                      params.set(scope === 'group' ? 'group' : 'participant', id);
                      params.delete(scope === 'group' ? 'participant' : 'group');
                    });
                  }}
                >
                  {preparedLabel}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {prepared.length > 1 ? (
          <Select
            aria-label="Evidence submission scope"
            value={submissionScope}
            onChange={(event) => setSubmissionScope(event.target.value as 'current' | 'all')}
            options={[
              { value: 'current', label: 'Current group or learner only' },
              { value: 'all', label: `All ${prepared.length} prepared records` },
            ]}
          />
        ) : null}
        <Button
          type="submit"
          disabled={
            pending ||
            !prepared.length ||
            (submissionScope === 'current' && !draft?.observation.trim())
          }
        >
          {pending
            ? 'Submitting…'
            : submissionScope === 'all'
              ? `Submit ${prepared.length} prepared ${scope === 'group' ? 'group ' : ''}records`
              : `Submit evidence for ${
                  current && ('learner_name' in current ? current.learner_name : current.name)
                }`}
        </Button>
      </div>
    </form>
  );
}
