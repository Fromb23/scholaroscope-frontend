'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save, Shuffle, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { parseAppDestination } from '@/app/core/auth/navigation';
import { resolveAppError } from '@/app/core/errors';
import { resolveErrorMessage } from '@/app/core/errors';
import { useGroupingContext, useGroupingMutations } from '@/app/core/hooks/useGrouping';
import { draftGroupsFromRandomPreview, moveDraftLearner } from '@/app/core/lib/groupingDraft';
import type {
  GroupingContextType,
  GroupingDraftGroup,
  GroupingLearner,
} from '@/app/core/types/grouping';

let nextClientGroup = 1;

function fromServerGroup(group: {
  id: number;
  name: string;
  notes: string;
  members: GroupingLearner[];
}): GroupingDraftGroup {
  return {
    id: group.id,
    clientId: `server-${group.id}`,
    name: group.name,
    notes: group.notes,
    studentIds: group.members.map((learner) => learner.id),
  };
}

function createDraftGroup(index: number): GroupingDraftGroup {
  return {
    clientId: `new-${nextClientGroup++}`,
    name: `Group ${index + 1}`,
    notes: '',
    studentIds: [],
  };
}

export function SharedGroupBuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawType = searchParams.get('context');
  const type: GroupingContextType | null =
    rawType === 'project' || rawType === 'assignment' ? rawType : null;
  const id = Number(searchParams.get('id'));
  const valid = Boolean(type && Number.isInteger(id) && id > 0);
  const fallback = type === 'project' && id > 0 ? `/projects/${id}?tab=groups` : '/assignments';
  const returnTo = parseAppDestination(searchParams.get('returnTo')) ?? fallback;
  const query = useGroupingContext(type ?? 'project', id, valid);
  const mutations = useGroupingMutations(type ?? 'project', id);
  const [groups, setGroups] = useState<GroupingDraftGroup[]>([]);
  const [mode, setMode] = useState<'BY_GROUP_COUNT' | 'BY_MEMBERS_PER_GROUP'>('BY_GROUP_COUNT');
  const [amount, setAmount] = useState('4');
  const [namePrefix, setNamePrefix] = useState('Group');
  const [error, setError] = useState<string | null>(null);
  const [draftRevision, setDraftRevision] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [correctionMode, setCorrectionMode] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [lateGroup, setLateGroup] = useState<Record<number, string>>({});
  const [lateTasks, setLateTasks] = useState<Record<number, number[]>>({});

  useEffect(() => {
    if (isDirty) return;
    setGroups((query.data?.group_set?.groups ?? []).map(fromServerGroup));
    setDraftRevision(query.data?.group_set?.revision ?? 0);
  }, [
    isDirty,
    query.data?.context.id,
    query.data?.group_set?.groups,
    query.data?.group_set?.revision,
  ]);

  const learnerById = useMemo(
    () => new Map((query.data?.eligible_learners ?? []).map((learner) => [learner.id, learner])),
    [query.data?.eligible_learners],
  );
  const assignedIds = useMemo(() => new Set(groups.flatMap((group) => group.studentIds)), [groups]);
  const unassigned = (query.data?.eligible_learners ?? []).filter(
    (learner) => !assignedIds.has(learner.id),
  );

  const moveLearner = (studentId: number, targetClientId: string | null) => {
    setGroups((current) => moveDraftLearner(current, studentId, targetClientId));
    setIsDirty(true);
    setError(null);
  };

  const previewRandom = async () => {
    setError(null);
    const numericAmount = Number(amount);
    if (!Number.isInteger(numericAmount) || numericAmount < 1) {
      setError('Enter a positive whole number for the group count or size.');
      return;
    }
    try {
      const preview = await mutations.preview.mutateAsync({
        mode,
        name_prefix: namePrefix,
        ...(mode === 'BY_GROUP_COUNT'
          ? { group_count: numericAmount }
          : { members_per_group: numericAmount }),
      });
      setGroups(draftGroupsFromRandomPreview(preview.groups));
      setDraftRevision(preview.revision);
      setIsDirty(true);
    } catch (previewError) {
      setError(resolveErrorMessage(previewError, 'Random distribution could not be previewed.'));
    }
  };

  const save = async () => {
    setError(null);
    if (groups.some((group) => !group.name.trim())) {
      setError('Every group needs a name before saving.');
      return;
    }
    try {
      const payload = {
        revision: draftRevision,
        groups: groups.map((group) => ({
          ...(group.id ? { id: group.id } : {}),
          name: group.name.trim(),
          notes: group.notes.trim(),
          student_ids: group.studentIds,
        })),
      };
      if (correctionMode) {
        if (!correctionReason.trim()) {
          setError('Explain why this audited roster correction is required.');
          return;
        }
        await mutations.correctRoster.mutateAsync({
          ...payload,
          reason: correctionReason.trim(),
        });
      } else {
        await mutations.save.mutateAsync(payload);
      }
      await mutations.invalidateOrigin();
      router.push(returnTo);
      router.refresh();
    } catch (saveError) {
      setError(resolveErrorMessage(saveError, 'The complete roster could not be saved.'));
    }
  };

  if (!valid) {
    return (
      <ErrorBanner
        message="This group builder link is invalid."
        onDismiss={() => router.push('/')}
      />
    );
  }
  if (query.isLoading) return <LoadingSpinner message="Loading eligible learners and roster…" />;
  if (query.error || !query.data) {
    return (
      <AppErrorBanner
        error={resolveAppError(query.error, {
          domain: type === 'project' ? 'projects' : 'assignments',
          action: 'load',
        })}
        onAction={() => void query.refetch()}
      />
    );
  }
  const data = query.data;
  const lateAdmissionPanel =
    type === 'project' &&
    data.capabilities.can_manage &&
    (data.late_unassigned_participants ?? []).length ? (
      <Card className="space-y-4 border-[color:var(--color-warning)]">
        <div>
          <h2 className="font-semibold theme-text">Late participants awaiting a group</h2>
          <p className="text-sm theme-muted">
            Select an existing group and any active tasks they should join. Earlier task snapshots
            and evidence stay unchanged; unresolved missed instruction remains visible for
            follow-up.
          </p>
        </div>
        {(data.late_unassigned_participants ?? []).map((participant) => (
          <div
            key={participant.participant_id}
            className="space-y-3 rounded-lg border theme-border p-3"
          >
            <div>
              <p className="font-medium theme-text">{participant.full_name}</p>
              <p className="text-xs theme-muted">
                {participant.admission_number} · eligible from{' '}
                {participant.effective_from ?? 'recorded enrolment'}
                {participant.catch_up_status === 'TEACHER_DECISION_REQUIRED'
                  ? ' · catch-up decision unresolved'
                  : ''}
              </p>
            </div>
            <Select
              label="Existing group"
              value={lateGroup[participant.participant_id] ?? ''}
              onChange={(event) =>
                setLateGroup((current) => ({
                  ...current,
                  [participant.participant_id]: event.target.value,
                }))
              }
              options={[
                { value: '', label: 'Choose a group' },
                ...(data.group_set?.groups ?? []).map((group) => ({
                  value: String(group.id),
                  label: `${group.name} (${group.members.length} members)`,
                })),
              ]}
            />
            {(data.ongoing_tasks ?? []).length ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium theme-text">Applicable ongoing tasks</legend>
                {(data.ongoing_tasks ?? []).map((task) => (
                  <label key={task.id} className="flex items-center gap-2 text-sm theme-text">
                    <input
                      type="checkbox"
                      checked={(lateTasks[participant.participant_id] ?? []).includes(task.id)}
                      onChange={(event) =>
                        setLateTasks((current) => {
                          const selected = new Set(current[participant.participant_id] ?? []);
                          if (event.target.checked) selected.add(task.id);
                          else selected.delete(task.id);
                          return { ...current, [participant.participant_id]: [...selected] };
                        })
                      }
                    />
                    {task.task__title}
                  </label>
                ))}
              </fieldset>
            ) : (
              <p className="text-xs theme-muted">
                No task is currently active; future tasks use the updated roster.
              </p>
            )}
            <Button
              disabled={!lateGroup[participant.participant_id] || mutations.admitLate.isPending}
              onClick={() =>
                void mutations.admitLate
                  .mutateAsync({
                    revision: data.group_set?.revision ?? 0,
                    participant: participant.participant_id,
                    group: Number(lateGroup[participant.participant_id]),
                    task_executions: lateTasks[participant.participant_id] ?? [],
                  })
                  .catch((admissionError) =>
                    setError(
                      resolveErrorMessage(
                        admissionError,
                        'The learner could not be admitted. Check eligibility and group capacity.',
                      ),
                    ),
                  )
              }
            >
              {mutations.admitLate.isPending ? 'Admitting…' : 'Admit to group and selected tasks'}
            </Button>
          </div>
        ))}
      </Card>
    ) : null;
  if (!data.capabilities.can_manage || (data.lock.is_locked && !correctionMode)) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push(returnTo)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card className="border-[color:var(--color-warning)]">
          <h1 className="text-xl font-semibold theme-text">{data.context.title} roster</h1>
          <p className="mt-1 text-sm theme-muted">
            {data.lock.is_locked
              ? data.lock.lock_reason
              : 'You may inspect this roster, but only an eligible subject instructor can change it.'}
          </p>
          {data.lock.is_locked ? (
            <div className="mt-3 space-y-3">
              <p className="text-xs theme-subtle">
                {data.lock.evidence_count} evidence record(s) and {data.lock.evaluation_count}{' '}
                group-derived evaluation(s) depend on this roster.
              </p>
              {type === 'project' && data.capabilities.can_manage ? (
                <Button onClick={() => setCorrectionMode(true)}>
                  Start audited roster correction
                </Button>
              ) : null}
            </div>
          ) : null}
        </Card>
        {lateAdmissionPanel}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data.group_set?.groups ?? []).map((group) => (
            <Card key={group.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold theme-text">{group.name}</h2>
                <span className="text-xs theme-muted">{group.members.length} members</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.members.map((learner) => (
                  <span
                    key={learner.id}
                    className="rounded-full border theme-border px-2 py-1 text-xs theme-text"
                  >
                    {learner.full_name}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push(returnTo)}>
        <ArrowLeft className="h-4 w-4" />
        Cancel and return
      </Button>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold theme-text">Group builder</h1>
          <span
            className={`rounded-full px-2 py-1 text-xs ${isDirty ? 'bg-amber-100 text-amber-800' : 'theme-surface-muted theme-muted'}`}
          >
            {isDirty ? 'Unsaved roster changes' : `Roster revision ${draftRevision}`}
          </span>
        </div>
        <p className="theme-muted">
          {data.context.title} · {data.context.population_label}
        </p>
      </div>

      {lateAdmissionPanel}

      {correctionMode ? (
        <Card className="space-y-3 border-[color:var(--color-warning)]">
          <h2 className="font-semibold theme-text">Audited roster correction</h2>
          <p className="text-sm theme-muted">
            Existing evidence, evaluations and captured membership remain unchanged. This roster
            revision applies to subsequent project tasks.
          </p>
          <Input
            label="Correction reason"
            required
            value={correctionReason}
            onChange={(event) => setCorrectionReason(event.target.value)}
          />
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm theme-muted">Eligible</p>
          <p className="text-2xl font-bold theme-text">{data.counts.eligible}</p>
        </Card>
        <Card>
          <p className="text-sm theme-muted">Assigned in draft</p>
          <p className="text-2xl font-bold theme-text">{assignedIds.size}</p>
        </Card>
        <Card>
          <p className="text-sm theme-muted">Unassigned in draft</p>
          <p className="text-2xl font-bold theme-text">{unassigned.length}</p>
        </Card>
      </div>

      {data.legacy.status === 'FAILED' ? (
        <Card className="border-[color:var(--color-danger)]">
          <h2 className="font-semibold theme-text">Legacy reconciliation failed</h2>
          <p className="text-sm theme-muted">
            {data.group_set?.reconciliation_error ||
              'The historical roster needs review before changes can be saved.'}
          </p>
        </Card>
      ) : data.legacy.status === 'NEEDS_RECONCILIATION' ? (
        <Card className="space-y-3 border-[color:var(--color-warning)]">
          <div>
            <h2 className="font-semibold theme-text">Legacy group — needs reconciliation</h2>
            <p className="text-sm theme-muted">
              Historical groups and memberships will be linked without deleting their original
              records.
            </p>
          </div>
          <Button
            variant="secondary"
            disabled={mutations.reconcile.isPending}
            onClick={() =>
              void mutations.reconcile.mutateAsync().catch((reconcileError) => {
                setError(
                  resolveErrorMessage(reconcileError, 'Legacy groups could not be reconciled.'),
                );
              })
            }
          >
            {mutations.reconcile.isPending ? 'Reconciling…' : 'Reconcile legacy groups'}
          </Button>
        </Card>
      ) : null}

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {data.eligible_learners.length === 0 ? (
        <Card>
          <p className="py-8 text-center theme-muted">
            This cohort has no active eligible learners to group.
          </p>
        </Card>
      ) : (
        <>
          {!correctionMode ? (
            <Card className="space-y-4">
              <h2 className="font-semibold theme-text">Random distribution preview</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Select
                  label="Distribution method"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as typeof mode)}
                  options={[
                    { value: 'BY_GROUP_COUNT', label: 'Number of groups' },
                    { value: 'BY_MEMBERS_PER_GROUP', label: 'Learners per group' },
                  ]}
                />
                <Input
                  label={mode === 'BY_GROUP_COUNT' ? 'Group count' : 'Group size'}
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <Input
                  label="Group name prefix"
                  value={namePrefix}
                  onChange={(event) => setNamePrefix(event.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => void previewRandom()}
                disabled={mutations.preview.isPending}
              >
                <Shuffle className="h-4 w-4" />
                {mutations.preview.isPending ? 'Building preview…' : 'Preview random distribution'}
              </Button>
            </Card>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)]">
            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold theme-text">Unassigned learners</h2>
                  <p className="text-sm theme-muted">{unassigned.length} remaining</p>
                </div>
              </div>
              {unassigned.length ? (
                unassigned.map((learner) => (
                  <div
                    key={learner.id}
                    className="space-y-2 border-b theme-border pb-3 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium theme-text">{learner.full_name}</p>
                      <p className="text-xs theme-muted">{learner.admission_number}</p>
                    </div>
                    <Select
                      aria-label={`Assign ${learner.full_name}`}
                      value=""
                      onChange={(event) => moveLearner(learner.id, event.target.value)}
                      options={[
                        { value: '', label: 'Choose group' },
                        ...groups.map((group) => ({ value: group.clientId, label: group.name })),
                      ]}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm theme-muted">Every eligible learner is assigned.</p>
              )}
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold theme-text">Draft groups</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setGroups((current) => [...current, createDraftGroup(current.length)]);
                    setIsDirty(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add group
                </Button>
              </div>
              {groups.length === 0 ? (
                <Card>
                  <p className="py-8 text-center theme-muted">
                    Add a group manually or preview a random distribution.
                  </p>
                </Card>
              ) : (
                groups.map((group) => (
                  <Card key={group.clientId} className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2">
                        <Input
                          label="Group name"
                          value={group.name}
                          onChange={(event) => {
                            setGroups((current) =>
                              current.map((item) =>
                                item.clientId === group.clientId
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            );
                            setIsDirty(true);
                          }}
                        />
                        <Input
                          label="Notes"
                          value={group.notes}
                          onChange={(event) => {
                            setGroups((current) =>
                              current.map((item) =>
                                item.clientId === group.clientId
                                  ? { ...item, notes: event.target.value }
                                  : item,
                              ),
                            );
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${group.name}`}
                        onClick={() => {
                          setGroups((current) =>
                            current.filter((item) => item.clientId !== group.clientId),
                          );
                          setIsDirty(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {group.studentIds.length ? (
                        group.studentIds.map((studentId) => {
                          const learner = learnerById.get(studentId);
                          if (!learner) return null;
                          return (
                            <div
                              key={studentId}
                              className="grid gap-2 border-t theme-border pt-3 sm:grid-cols-[1fr_14rem] sm:items-center"
                            >
                              <div>
                                <p className="text-sm font-medium theme-text">
                                  {learner.full_name}
                                </p>
                                <p className="text-xs theme-muted">{learner.admission_number}</p>
                              </div>
                              <Select
                                aria-label={`Move ${learner.full_name}`}
                                value={group.clientId}
                                onChange={(event) =>
                                  moveLearner(studentId, event.target.value || null)
                                }
                                options={[
                                  { value: '', label: 'Move to unassigned' },
                                  ...groups.map((candidate) => ({
                                    value: candidate.clientId,
                                    label: candidate.name,
                                  })),
                                ]}
                              />
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm theme-muted">No learners assigned.</p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="sticky bottom-4 flex justify-end gap-3 rounded-xl border theme-border theme-surface-elevated p-3 shadow-lg">
        <Button variant="secondary" onClick={() => router.push(returnTo)}>
          Cancel
        </Button>
        <Button
          onClick={() => void save()}
          disabled={
            mutations.save.isPending ||
            mutations.correctRoster.isPending ||
            data.eligible_learners.length === 0 ||
            (correctionMode && !correctionReason.trim())
          }
        >
          <Save className="h-4 w-4" />
          {mutations.save.isPending || mutations.correctRoster.isPending
            ? 'Saving roster…'
            : correctionMode
              ? 'Save audited correction'
              : 'Save complete roster'}
        </Button>
      </div>
    </div>
  );
}
