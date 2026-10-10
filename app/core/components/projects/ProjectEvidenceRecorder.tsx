'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import type {
  ProjectDeployment,
  ProjectGroup,
  ProjectParticipant,
  ProjectTask,
} from '@/app/core/types/projects';

type Scope = 'individual' | 'group';
type Draft = { evidenceType: string; observation: string };

export function ProjectEvidenceRecorder({
  project,
  task,
  participants,
  groups,
  pending,
  onCancel,
  onScopeChange,
  onSubmit,
}: {
  project: ProjectDeployment;
  task: ProjectTask;
  participants: ProjectParticipant[];
  groups: ProjectGroup[];
  pending: boolean;
  onCancel: () => void;
  onScopeChange: () => void;
  onSubmit: (payload: { task: number; items: Array<Record<string, unknown>> }) => Promise<void>;
}) {
  const activeParticipants = useMemo(
    () => participants.filter((item) => item.status === 'ACTIVE'),
    [participants],
  );
  const [scope, setScope] = useState<Scope | null>(null);
  const [learnerIndex, setLearnerIndex] = useState(0);
  const [groupIndex, setGroupIndex] = useState(0);
  const [learnerDrafts, setLearnerDrafts] = useState<Record<number, Draft>>({});
  const [groupDrafts, setGroupDrafts] = useState<Record<number, Draft>>({});
  const items = scope === 'individual' ? activeParticipants : groups;
  const index = scope === 'individual' ? learnerIndex : groupIndex;
  const current = scope ? items[index] : undefined;
  const drafts = scope === 'individual' ? learnerDrafts : groupDrafts;
  const draft = current
    ? drafts[current.id] ?? { evidenceType: 'TEACHER_OBSERVATION', observation: '' }
    : null;
  const prepared = Object.entries(drafts).filter(([, value]) => value.observation.trim());

  const chooseScope = (next: Scope) => {
    setScope(next);
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
    if (scope === 'individual') setLearnerIndex((value) => value + offset);
    else setGroupIndex((value) => value + offset);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!scope || !prepared.length) return;
    void onSubmit({
      task: task.id,
      items: prepared.map(([id, value]) => ({
        [scope === 'individual' ? 'participant' : 'group']: Number(id),
        evidence_type: value.evidenceType,
        observed_at: new Date().toISOString(),
        structured_observation: { note: value.observation.trim() },
      })),
    }).catch(() => undefined);
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="rounded-lg border theme-border p-3">
        <p className="text-xs theme-subtle">Task</p>
        <p className="font-semibold theme-text">{task.code}: {task.title}</p>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium theme-text">Who is this evidence for?</legend>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={scope === 'individual' ? 'primary' : 'secondary'} onClick={() => chooseScope('individual')}>Individual learners</Button>
          <Button type="button" variant={scope === 'group' ? 'primary' : 'secondary'} onClick={() => chooseScope('group')}>Group</Button>
        </div>
      </fieldset>
      {scope && !current ? (
        <p className="text-sm theme-muted">No active {scope === 'individual' ? 'learners' : 'groups'} are available.</p>
      ) : null}
      {scope && current && draft ? (
        <div className="space-y-4 rounded-lg border theme-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold theme-text">{'learner_name' in current ? current.learner_name : current.name}</p>
              <p className="text-sm theme-muted">{scope === 'individual' ? `Learner ${index + 1} of ${items.length}` : `Group ${index + 1} of ${items.length}`}</p>
              {scope === 'group' ? <Link className="text-sm text-blue-600 hover:underline" href={`/projects/${project.id}/groups/${current.id}`}>View group members</Link> : null}
            </div>
            {draft.observation.trim() ? <span className="text-xs text-green-700">Draft prepared</span> : null}
          </div>
          <div className="flex justify-between gap-2">
            <Button type="button" variant="secondary" disabled={index === 0} onClick={() => move(-1)}>Previous {scope === 'individual' ? 'learner' : 'group'}</Button>
            <Button type="button" variant="secondary" disabled={index + 1 >= items.length} onClick={() => move(1)}>Next {scope === 'individual' ? 'learner' : 'group'}</Button>
          </div>
          <Select
            label="Evidence type"
            required
            value={draft.evidenceType}
            onChange={(event) => updateDraft({ evidenceType: event.target.value })}
            options={['TEACHER_OBSERVATION', 'INDIVIDUAL_CONTRIBUTION', 'LIVE_DEMONSTRATION'].map((value) => ({ value, label: value.replaceAll('_', ' ') }))}
          />
          <label className="block text-sm font-medium theme-text">Observation
            <textarea className="theme-input mt-1 min-h-28 w-full rounded-lg px-4 py-2" value={draft.observation} onChange={(event) => updateDraft({ observation: event.target.value })} />
          </label>
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={pending || !prepared.length}>
          {pending ? 'Submitting…' : `Submit ${prepared.length} evidence ${prepared.length === 1 ? 'record' : 'records'}`}
        </Button>
      </div>
    </form>
  );
}
