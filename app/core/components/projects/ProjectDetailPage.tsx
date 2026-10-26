'use client';

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Children, useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ResponsiveActionSheet } from '@/app/components/ui/actions';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { resolveAppError } from '@/app/core/errors';
import { buildProjectWorkspaceHref, projectBackHref } from './projectNavigation';
import { ProjectScheduleStatus } from './ProjectScheduleStatus';
import {
  useProjectAction,
  useProjectDeployment,
  useProjectRelated,
  useProjectResourceMutations,
} from '@/app/core/hooks/useProjects';
import { getProjectLifecycleActions, type ProjectLifecycleAction } from './projectAuthority';
import { ProjectEvidenceRecorder } from './ProjectEvidenceRecorder';
import { ProjectTaskEvaluationEditor } from './ProjectTaskEvaluationEditor';
import { ProjectTaskWorkspace } from './ProjectTaskWorkspace';
import { ProjectCatchUpReview } from './ProjectCatchUpReview';
import { GroupRosterSummary } from '@/app/core/components/grouping/GroupRosterSummary';
import { useSemanticPageTitle } from '@/app/core/pageIdentity/PageTitleProvider';
import { getProjectWorkspacePageTitle } from '@/app/core/pageIdentity/contextualPageTitles';
import type { ProjectClassObservation, ProjectTask } from '@/app/core/types/projects';

const tabs = [
  'overview',
  'tasks',
  'participants',
  'groups',
  'evidence',
  'observations',
  'evaluations',
  'results',
  'administration',
  'definition',
] as const;
type Tab = (typeof tabs)[number];

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ProjectDetailPage() {
  const route = useParams<{ deploymentId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Number(route.deploymentId);
  const activeTab = tabs.includes(searchParams.get('tab') as Tab)
    ? (searchParams.get('tab') as Tab)
    : 'overview';
  const deploymentQuery = useProjectDeployment(Number.isFinite(id) && id > 0 ? id : null);
  const related = useProjectRelated(Number.isFinite(id) && id > 0 ? id : null);
  const mutation = useProjectAction(id);
  const resources = useProjectResourceMutations(id);
  const [pendingAction, setPendingAction] = useState<ProjectLifecycleAction | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const requestedWorkSection = searchParams.get('section') ?? searchParams.get('action');
  const initialWorkAction =
    requestedWorkSection === 'evidence' || requestedWorkSection === 'evaluation'
      ? (requestedWorkSection as 'evidence' | 'evaluation')
      : null;
  const initialWorkTask = Number(searchParams.get('task')) || null;
  const [workAction, setWorkAction] = useState<'evidence' | 'evaluation' | null>(initialWorkAction);
  const [evidenceTaskId, setEvidenceTaskId] = useState<number | null>(
    initialWorkAction === 'evidence' ? initialWorkTask : null,
  );
  const [evaluationTaskId, setEvaluationTaskId] = useState<number | null>(
    initialWorkAction === 'evaluation' ? initialWorkTask : null,
  );
  const [observationTask, setObservationTask] = useState(searchParams.get('task') ?? '');
  const [observationComment, setObservationComment] = useState('');
  const observationOpen = searchParams.get('section') === 'observation';
  const project = deploymentQuery.data;
  useSemanticPageTitle(
    getProjectWorkspacePageTitle({
      accessConfirmed: deploymentQuery.isSuccess && !deploymentQuery.isError && project?.id === id,
      projectTitle: project?.title,
      cohortName: project?.cohort?.name,
    }),
  );
  const error = mutation.error
    ? resolveAppError(mutation.error, {
        domain: 'projects',
        action: pendingAction === 'publish' ? 'publish' : 'update',
        entityLabel: 'project',
      })
    : null;
  const lifecycleActions = project ? getProjectLifecycleActions(project) : [];

  const returnTo = projectBackHref(searchParams.get('returnTo'));
  const selectedTask = Number(searchParams.get('task')) || null;
  const selectedParticipant = Number(searchParams.get('participant')) || null;
  const selectedGroup = Number(searchParams.get('group')) || null;
  const selectedScope = searchParams.get('scope') === 'individual' ? 'individual' : 'group';
  const tasks = project?.definition?.tasks ?? [];
  const requestedTaskIndex = tasks.findIndex((task) => task.id === selectedTask);
  const selectedTaskIndex = requestedTaskIndex >= 0 ? requestedTaskIndex : 0;
  const taskInView = tasks[selectedTaskIndex] ?? null;
  const currentGroups = related.groups.data ?? [];
  const allGroups = [...currentGroups, ...(related.historicalGroups.data ?? [])].filter(
    (group, index, rows) => rows.findIndex((candidate) => candidate.id === group.id) === index,
  );
  const taskExecution = project?.task_executions?.find((row) => row.task === taskInView?.id);
  const taskGroups = taskExecution?.eligible_group_ids?.length
    ? allGroups.filter((group) => taskExecution.eligible_group_ids.includes(group.id))
    : currentGroups;
  const activeParticipants = (related.participants.data ?? []).filter(
    (participant) => participant.status === 'ACTIVE',
  );
  const scopeTargets = selectedScope === 'group' ? taskGroups : activeParticipants;
  const requestedTargetIndex = scopeTargets.findIndex((target) =>
    selectedScope === 'group' ? target.id === selectedGroup : target.id === selectedParticipant,
  );
  const selectedTargetIndex = requestedTargetIndex >= 0 ? requestedTargetIndex : 0;
  const selectedTarget = scopeTargets[selectedTargetIndex] ?? null;
  const selectedTaskEvidence = (related.evidence.data ?? []).filter((item) => {
    if (item.task !== taskInView?.id || !selectedTarget) return false;
    if (selectedScope === 'group') return item.group === selectedTarget.id;
    const participant = activeParticipants.find((row) => row.id === selectedTarget.id);
    return Boolean(
      participant &&
      (item.learner === participant.learner ||
        item.attributed_participants.includes(participant.id)),
    );
  });
  const selectedTaskEvaluations = (related.evaluations.data ?? []).filter((item) => {
    if (item.task !== taskInView?.id || !selectedTarget) return false;
    return selectedScope === 'group'
      ? item.source_group === selectedTarget.id
      : item.participant === selectedTarget.id;
  });
  const selectScopeTarget = (index: number) => {
    const target = scopeTargets[index];
    if (!target) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set('scope', selectedScope);
    next.delete(selectedScope === 'group' ? 'participant' : 'group');
    next.set(selectedScope === 'group' ? 'group' : 'participant', String(target.id));
    router.replace(`/projects/${id}?${next.toString()}`, { scroll: false });
  };
  const openTask = (taskId: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', 'tasks');
    next.set('task', String(taskId));
    const execution = project?.task_executions?.find((row) => row.task === taskId);
    if (
      next.get('scope') === 'group' &&
      execution?.eligible_group_ids.length &&
      !execution.eligible_group_ids.includes(Number(next.get('group')))
    ) {
      next.set('group', String(execution.eligible_group_ids[0]));
    }
    router.replace(`/projects/${id}?${next.toString()}`, { scroll: false });
  };
  const openTaskAction = (taskId: number, action: 'evidence' | 'evaluation') => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', 'tasks');
    next.set('task', String(taskId));
    next.set('action', action);
    next.set('section', action);
    next.set('scope', selectedScope);
    if (selectedTarget) {
      next.set(selectedScope === 'group' ? 'group' : 'participant', String(selectedTarget.id));
      next.delete(selectedScope === 'group' ? 'participant' : 'group');
    }
    router.replace(`/projects/${id}?${next.toString()}`, { scroll: false });
  };
  const setTab = (tab: Tab) => {
    if (tab === 'tasks' && taskInView) {
      openTask(taskInView.id);
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    if (tab !== 'tasks') {
      for (const key of ['action', 'section', 'scope', 'group', 'participant']) next.delete(key);
    }
    router.replace(buildProjectWorkspaceHref(id, next, tab), { scroll: false });
  };
  const closeTaskAction = () => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of ['action', 'section']) next.delete(key);
    router.replace(`/projects/${id}?${next.toString()}`, { scroll: false });
    setEvidenceTaskId(null);
    setEvaluationTaskId(null);
    setWorkAction(null);
  };
  useEffect(() => {
    if (activeTab === 'tasks' && !selectedTask && taskInView) openTask(taskInView.id);
    // Route state is the source of truth; this only canonicalizes a task-less deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedTask, taskInView?.id]);
  useEffect(() => {
    setWorkAction(initialWorkAction);
    setEvidenceTaskId(initialWorkAction === 'evidence' ? initialWorkTask : null);
    setEvaluationTaskId(initialWorkAction === 'evaluation' ? initialWorkTask : null);
  }, [initialWorkAction, initialWorkTask]);
  const confirmAction = async () => {
    if (!pendingAction) return;
    try {
      await mutation.mutateAsync({
        action: pendingAction,
        payload: pendingAction === 'cancel' ? { reason: cancelReason } : {},
      });
      setPendingAction(null);
      setCancelReason('');
    } catch {
      /* Structured error remains on the foreground sheet. */
    }
  };

  if (deploymentQuery.isLoading)
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner message="Loading project workspace…" fullScreen={false} />
      </div>
    );
  if (deploymentQuery.error || !project)
    return (
      <AppErrorBanner
        error={resolveAppError(deploymentQuery.error, {
          domain: 'projects',
          action: 'load',
          entityLabel: 'project',
        })}
        onAction={() => void deploymentQuery.refetch()}
      />
    );

  return (
    <div className="space-y-6">
      <Link href={returnTo} className="inline-flex items-center gap-2 text-sm theme-muted">
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold theme-text">{project.title}</h1>
            <Badge variant="info">{project.status}</Badge>
            {project.authority.can_supervise ? <Badge variant="purple">Supervision</Badge> : null}
          </div>
          <p className="mt-1 theme-muted">
            {project.subject.name} · {project.cohort.name} · {project.administering_instructor_name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lifecycleActions.map((action) => (
            <Button
              key={action}
              variant={action === 'cancel' ? 'danger' : 'primary'}
              size="sm"
              onClick={() => setPendingAction(action)}
            >
              {action === 'complete' ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete project
                </>
              ) : (
                label(action)
              )}
            </Button>
          ))}
        </div>
      </div>

      <div
        className="flex gap-2 overflow-x-auto border-b theme-border pb-2"
        aria-label="Project sections"
      >
        {tabs.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={activeTab === tab ? 'primary' : 'ghost'}
            onClick={() => setTab(tab)}
          >
            {label(tab)}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-4">
          <ProjectScheduleStatus schedule={project.schedule} />
          {project.authority.can_administer ? (
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold theme-text">Project class observation</p>
                <p className="text-sm theme-muted">
                  Describe how the whole stream handled this project. This does not become learner
                  evidence.
                </p>
              </div>
              <Button
                onClick={() => {
                  setObservationTask('');
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('tab', 'overview');
                  next.delete('task');
                  next.set('section', 'observation');
                  router.replace(`/projects/${id}?${next.toString()}`, { scroll: false });
                }}
              >
                Record project class observation
              </Button>
            </Card>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm theme-subtle">Learners</p>
              <p className="text-2xl font-bold theme-text">{project.participant_count}</p>
            </Card>
            <Card>
              <p className="text-sm theme-subtle">Tasks</p>
              <p className="text-2xl font-bold theme-text">{project.progress.task_count}</p>
            </Card>
            <Card>
              <p className="text-sm theme-subtle">Maximum marks</p>
              <p className="text-2xl font-bold theme-text">
                {project.definition?.maximum_marks ?? '—'}
              </p>
            </Card>
            <Card>
              <p className="text-sm theme-subtle">Project progress</p>
              <p className="text-lg font-bold theme-text">
                {project.progress.completed_task_count}/{project.progress.task_count} tasks
              </p>
            </Card>
          </div>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold theme-text">Official project identity</p>
              <p className="text-sm theme-muted">
                {project.definition?.authority_key} · {project.definition?.curriculum_key} · Version{' '}
                {project.definition?.version}
              </p>
              <p className="text-sm theme-muted">
                Target: {project.cohort.name} — {project.subject.name} · Lead instructor:{' '}
                {project.administering_instructor_name}
              </p>
            </div>
            <Badge>{project.definition?.status ?? project.status} definition</Badge>
          </Card>
        </div>
      ) : null}

      {activeTab === 'tasks' ? (
        <div className="space-y-4">
          {taskInView ? (
            <>
              {resources.activateTask.error ? (
                <AppErrorBanner
                  error={resolveAppError(resources.activateTask.error, {
                    domain: 'projects',
                    action: 'update',
                    entityLabel: 'task',
                  })}
                />
              ) : null}
              <ProjectTaskWorkspace
                project={project}
                task={taskInView}
                taskIndex={selectedTaskIndex}
                onPrevious={() => openTask(tasks[selectedTaskIndex - 1].id)}
                onNext={() => openTask(tasks[selectedTaskIndex + 1].id)}
                activating={resources.activateTask.isPending}
                onStartTask={() => void resources.activateTask.mutateAsync(taskInView.id)}
                onRecordEvidence={() => {
                  resources.recordEvidenceBatch.reset();
                  setEvidenceTaskId(taskInView.id);
                  setWorkAction('evidence');
                  openTaskAction(taskInView.id, 'evidence');
                }}
                onEvaluate={() => {
                  resources.createEvaluation.reset();
                  resources.recordCriterionScore.reset();
                  setEvaluationTaskId(taskInView.id);
                  setWorkAction('evaluation');
                  openTaskAction(taskInView.id, 'evaluation');
                }}
                onRecordTaskObservation={() => {
                  setObservationTask(String(taskInView.id));
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('tab', 'tasks');
                  next.set('task', String(taskInView.id));
                  next.set('section', 'observation');
                  router.replace(`/projects/${id}?${next.toString()}`, { scroll: false });
                }}
                scope={selectedScope}
                onScopeChange={(scope) => {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('scope', scope);
                  next.delete(scope === 'group' ? 'participant' : 'group');
                  const first = scope === 'group' ? taskGroups[0] : activeParticipants[0];
                  if (first)
                    next.set(scope === 'group' ? 'group' : 'participant', String(first.id));
                  router.replace(`/projects/${id}?${next.toString()}`, { scroll: false });
                }}
                selectedTargetName={
                  selectedTarget
                    ? 'name' in selectedTarget
                      ? selectedTarget.name
                      : selectedTarget.learner_name
                    : null
                }
                targetIndex={selectedTargetIndex}
                targetCount={scopeTargets.length}
                onPreviousTarget={() => selectScopeTarget(selectedTargetIndex - 1)}
                onNextTarget={() => selectScopeTarget(selectedTargetIndex + 1)}
                evidence={selectedTaskEvidence}
                evaluations={selectedTaskEvaluations}
              />
            </>
          ) : (
            <Card>
              <p className="theme-muted">No tasks are available for this project.</p>
            </Card>
          )}
        </div>
      ) : null}
      {activeTab === 'participants' ? (
        <ListState query={related.participants} empty="No participants captured.">
          {(related.participants.data ?? []).map((item) => (
            <Row
              key={item.id}
              title={item.learner_name}
              icon={
                item.is_late_addition ? (
                  <ProjectCatchUpReview
                    deploymentId={id}
                    participant={item}
                    canReview={project.authority.can_manage_groups}
                  />
                ) : null
              }
              detail={`${item.status}${item.is_late_addition ? ` · Late addition${item.effective_from ? ` from ${item.effective_from}` : ''}` : ''}${item.catch_up_status === 'TEACHER_DECISION_REQUIRED' ? ' · Project missed-instruction review unresolved' : ''}${item.withdrawn_at ? ` · Departed ${new Date(item.withdrawn_at).toLocaleDateString()} (history only)` : ''}`}
            />
          ))}
        </ListState>
      ) : null}
      {activeTab === 'groups' ? (
        <div className="space-y-4">
          <GroupRosterSummary type="project" id={project.id} />
          {(related.historicalGroups.data ?? []).length ? (
            <Card className="space-y-3">
              <div>
                <h2 className="font-semibold theme-text">Group history / audit</h2>
                <p className="text-sm theme-muted">
                  Superseded groups remain read-only so older evidence and captured membership stay
                  traceable.
                </p>
              </div>
              {(related.historicalGroups.data ?? []).map((group) => (
                <Row
                  key={group.id}
                  title={`${group.name} · Historical`}
                  detail={`${group.historical_members.length + group.members.length} captured members · ${group.dependency_state.evidence_count} evidence · ${group.dependency_state.evaluation_count} evaluations`}
                />
              ))}
            </Card>
          ) : null}
        </div>
      ) : null}
      {activeTab === 'evidence' ? (
        <ListState query={related.evidence} empty="No evidence recorded.">
          {(related.evidence.data ?? []).map((item) => (
            <Row
              key={item.id}
              title={`${label(item.evidence_type)} · ${label(item.late_state)} · ${item.officially_eligible ? 'Eligible for official evaluation' : 'Preserved, awaiting authorization'}`}
              detail={`${tasks.find((task) => task.id === item.task)?.title ?? `Task ${item.task}`} · ${item.group ? `Group: ${allGroups.find((group) => group.id === item.group)?.name ?? item.group}` : `Learner: ${activeParticipants.find((participant) => participant.learner === item.learner)?.learner_name ?? item.learner}`} · ${project.subject.name} · ${new Date(item.observed_at).toLocaleString()}`}
              icon={item.authority?.can_authorize_late ? (
                <Button size="sm" variant="secondary" onClick={() => {
                  const reason = window.prompt('Reason for accepting this late evidence');
                  if (reason?.trim()) void resources.authorizeLateEvidence.mutateAsync({ evidence: item.id, reason });
                }}>
                  Authorize late evidence
                </Button>
              ) : item.authority?.locked_reason ? <span className="text-xs theme-muted">{item.authority.locked_reason}</span> : null}
            />
          ))}
        </ListState>
      ) : null}
      {activeTab === 'observations' ? (
        <ListState query={related.observations} empty="No class observations recorded.">
          <GroupedProjectObservations
            observations={related.observations.data ?? []}
            tasks={tasks}
            deploymentId={id}
            onEdit={async (item) => {
              const comment = window.prompt('Correct this draft observation', item.comment);
              if (!comment?.trim()) return;
              await resources.updateClassObservation.mutateAsync({
                observation: item.id, task: item.task, comment,
                observed_at: item.observed_at,
              });
            }}
            onDiscard={async (item) => {
              if (!window.confirm('Discard this draft observation? The audit record will be retained.')) return;
              const reason = window.prompt('Reason for discarding this draft');
              if (!reason?.trim()) return;
              await resources.discardClassObservation.mutateAsync({ observation: item.id, reason });
            }}
            onAmend={async (item) => {
              const reason = window.prompt('Reason for amending this finalized observation');
              if (!reason?.trim()) return;
              const comment = window.prompt('Corrected observation', item.comment);
              if (!comment?.trim()) return;
              await resources.createClassObservation.mutateAsync({
                task: item.task ?? undefined, comment, observed_at: new Date().toISOString(),
                supersedes: item.id, amendment_reason: reason,
              });
            }}
          />
        </ListState>
      ) : null}
      {activeTab === 'evaluations' ? (
        <ListState query={related.evaluations} empty="No task evaluations recorded.">
          {(related.evaluations.data ?? []).map((item) => (
            <div
              key={item.id}
              className={
                selectedTask === item.task && selectedParticipant === item.participant
                  ? 'rounded-lg px-2 ring-2 ring-blue-500'
                  : ''
              }
            >
              <Row
                title={`${activeParticipants.find((participant) => participant.id === item.participant)?.learner_name ?? 'Learner name unavailable'} · ${tasks.find((task) => task.id === item.task)?.title ?? 'Task title unavailable'}`}
                detail={`${item.source_group ? `Group: ${allGroups.find((group) => group.id === item.source_group)?.name ?? 'Group name unavailable'} · ` : 'Individual · '}${project.subject.name} · ${item.status} · ${item.derived_score} · Learner feedback: ${item.teacher_feedback || 'None'} · Projection: ${item.evidence_projection_status}${item.evidence_projection_warning ? ` (${item.evidence_projection_warning})` : ''}`}
                icon={
                  project.authority.can_evaluate ? (
                    <Button size="sm" onClick={() => {
                      setEvaluationTaskId(item.task);
                      setWorkAction('evaluation');
                      const next = new URLSearchParams(searchParams.toString());
                      next.set('tab', 'tasks'); next.set('task', String(item.task));
                      next.set('scope', 'individual'); next.set('participant', String(item.participant));
                      next.set('section', 'evaluation');
                      router.replace(`/projects/${id}?${next.toString()}`, { scroll: false });
                    }}>
                      {item.status === 'FINALIZED'
                        ? 'Review evaluation'
                        : item.criterion_scores.length
                          ? 'Continue evaluation'
                          : 'Evaluate learner'}
                    </Button>
                  ) : project.authority.can_finalize && item.status !== 'FINALIZED' ? (
                    <Button size="sm" onClick={() => resources.finalizeEvaluation.mutate(item.id)}>
                      Finalize
                    </Button>
                  ) : null
                }
              />
            </div>
          ))}
        </ListState>
      ) : null}
      {activeTab === 'results' ? (
        <ListState query={related.results} empty="No finalized results available.">
          {(related.results.data ?? []).map((item) => (
            <Row
              key={item.participant}
              title={item.learner_name}
              detail={`${item.project_score} · ${item.finalized_task_count} finalized tasks`}
            />
          ))}
        </ListState>
      ) : null}
      {activeTab === 'administration' ? (
        <ListState query={related.checklist} empty="No administration checklist items.">
          {(related.checklist.data ?? []).map((item) => (
            <Row
              key={item.id}
              title={item.label}
              detail={`${item.category} · ${item.completed ? 'Complete' : item.required ? 'Required' : 'Optional'}`}
              icon={
                project.authority.can_update_checklist ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resources.updateChecklist.mutate({
                        item: item.id,
                        completed: !item.completed,
                      })
                    }
                  >
                    {item.completed ? 'Reopen' : 'Complete'}
                  </Button>
                ) : item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-[color:var(--color-success)]" />
                ) : null
              }
            />
          ))}
        </ListState>
      ) : null}
      {activeTab === 'definition' && project.definition ? (
        <Card>
          <h2 className="text-lg font-semibold theme-text">
            {project.definition.title} · Version {project.definition.version}
          </h2>
          <p className="mt-2 theme-muted">{project.definition.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{project.definition.verification_tier}</Badge>
            <Badge>{project.definition.maximum_marks} marks</Badge>
            <Badge>{project.definition.collaboration_mode}</Badge>
          </div>
        </Card>
      ) : null}

      <ResponsiveActionSheet
        open={observationOpen && project.authority.can_administer}
        onOpenChange={(open) => {
          if (open) return;
          const next = new URLSearchParams(searchParams.toString());
          next.delete('section');
          router.replace(`/projects/${id}?${next.toString()}`, { scroll: false });
        }}
        title={
          observationTask ? 'Record task class observation' : 'Record project class observation'
        }
        description="This class-level observation stays in project context and does not become learner or group evidence."
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void resources.createClassObservation
              .mutateAsync({
                task: observationTask ? Number(observationTask) : undefined,
                comment: observationComment,
                observed_at: new Date().toISOString(),
              })
              .then(() => {
                setObservationComment('');
                const next = new URLSearchParams(searchParams.toString());
                next.delete('section');
                router.replace(`/projects/${id}?${next.toString()}`, { scroll: false });
              });
          }}
        >
          <Select
            label="Project or task"
            value={observationTask}
            onChange={(event) => setObservationTask(event.target.value)}
            options={[
              { value: '', label: 'Whole project' },
              ...(project.definition?.tasks ?? []).map((task) => ({
                value: task.id,
                label: `${task.code}. ${task.title}`,
              })),
            ]}
          />
          <label className="block text-sm font-medium theme-text">
            Class observation
            <textarea
              className="theme-input mt-1 min-h-24 w-full rounded-lg px-3 py-2"
              required
              value={observationComment}
              onChange={(event) => setObservationComment(event.target.value)}
            />
          </label>
          <Button
            type="submit"
            disabled={!observationComment.trim() || resources.createClassObservation.isPending}
          >
            Record observation
          </Button>
        </form>
      </ResponsiveActionSheet>

      <ResponsiveActionSheet
        open={Boolean(pendingAction)}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={pendingAction ? `${label(pendingAction)} project` : 'Project action'}
        description="The server will re-check permission, scope and lifecycle before applying this action."
        state={
          mutation.isPending
            ? 'loading'
            : error
              ? 'error'
              : pendingAction === 'cancel'
                ? 'warning'
                : 'idle'
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setPendingAction(null)}
              disabled={mutation.isPending}
            >
              Close
            </Button>
            <Button
              variant={pendingAction === 'cancel' ? 'danger' : 'primary'}
              onClick={() => void confirmAction()}
              disabled={
                mutation.isPending ||
                (pendingAction === 'cancel' && !cancelReason.trim()) ||
                (pendingAction === 'complete' && project.completion_readiness?.ready === false)
              }
            >
              {mutation.isPending ? 'Working…' : 'Confirm'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error ? <AppErrorBanner error={error} /> : null}
          {pendingAction === 'cancel' ? (
            <Input
              label="Cancellation reason"
              required
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          ) : pendingAction === 'complete' && project.completion_readiness ? (
            <div className="space-y-3 text-sm theme-muted">
              <p className="font-semibold theme-text">Completion readiness</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Completed tasks: {project.completion_readiness.completed_tasks}/
                  {project.completion_readiness.total_tasks}
                </li>
                <li>Outstanding evidence: {project.completion_readiness.outstanding_evidence}</li>
                <li>Pending evaluations: {project.completion_readiness.pending_evaluations}</li>
                <li>
                  Draft class observations: {project.completion_readiness.draft_class_observations}
                </li>
                <li>
                  Groups or learners without required work:{' '}
                  {project.completion_readiness.missing_required_work}
                </li>
                <li>Deadline state: {project.completion_readiness.deadline_state}</li>
              </ul>
              {project.completion_readiness.blockers.map((blocker) => (
                <p key={blocker} className="text-[color:var(--color-danger)]">
                  {blocker}
                </p>
              ))}
              <div>
                <p className="font-medium theme-text">Consequences of completion</p>
                {project.completion_readiness.consequences.map((consequence) => (
                  <p key={consequence}>• {consequence}</p>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm theme-muted">
              Current state: <strong>{project.status}</strong>. The result will be refreshed from
              the server.
            </p>
          )}
        </div>
      </ResponsiveActionSheet>
      <ResponsiveActionSheet
        open={Boolean(workAction)}
        onOpenChange={(open) => {
          if (!open) {
            resources.recordEvidenceBatch.reset();
            resources.createEvaluation.reset();
            resources.recordCriterionScore.reset();
            closeTaskAction();
          }
        }}
        title={workAction === 'evidence' ? 'Record project evidence' : 'Create task evaluation'}
        description="The server validates project scope, responsibility and lifecycle before saving."
        size="lg"
      >
        {(
          workAction === 'evidence'
            ? resources.recordEvidenceBatch.error
            : (resources.createEvaluation.error ?? resources.recordCriterionScore.error)
        ) ? (
          <AppErrorBanner
            error={resolveAppError(
              workAction === 'evidence'
                ? resources.recordEvidenceBatch.error
                : (resources.createEvaluation.error ?? resources.recordCriterionScore.error),
              {
                domain: 'projects',
                action: 'create',
                entityLabel: workAction === 'evidence' ? 'project evidence' : 'task evaluation',
              },
            )}
            className="mb-4"
          />
        ) : null}
        {workAction === 'evidence' && evidenceTaskId ? (
          <ProjectEvidenceRecorder
            project={project}
            task={tasks.find((task) => task.id === evidenceTaskId)!}
            participants={related.participants.data ?? []}
            groups={taskGroups}
            evidenceTypes={related.evidenceTypes.data}
            pending={resources.recordEvidenceBatch.isPending}
            onScopeChange={() => resources.recordEvidenceBatch.reset()}
            onCancel={() => {
              resources.recordEvidenceBatch.reset();
              closeTaskAction();
            }}
            onSubmit={async (payload) => {
              await resources.recordEvidenceBatch.mutateAsync(payload);
              setWorkAction(null);
              closeTaskAction();
            }}
          />
        ) : null}
        {workAction === 'evaluation' && evaluationTaskId ? (
          <ProjectTaskEvaluationEditor
            deploymentId={project.id}
            task={tasks.find((task) => task.id === evaluationTaskId)!}
            participants={related.participants.data ?? []}
            groups={taskGroups}
            evidence={(related.evidence.data ?? []).filter((item) => item.task === evaluationTaskId)}
            evaluations={(related.evaluations.data ?? []).filter((item) => item.task === evaluationTaskId)}
            pending={
              resources.createEvaluation.isPending || resources.saveEvaluationDraft.isPending ||
              resources.applyGroupEvaluationDraft.isPending || resources.finalizeEvaluation.isPending
            }
            onCancel={closeTaskAction}
            onSubmit={async (payloads) => {
              const savedGroups = new Set<number>();
              for (const payload of payloads) {
                const { criterion_scores: scores, evidence_ids, ...evaluationPayload } = payload;
                if (payload.source_group) {
                  if (savedGroups.has(payload.source_group)) continue;
                  savedGroups.add(payload.source_group);
                  await resources.applyGroupEvaluationDraft.mutateAsync({
                    deployment: project.id, task: payload.task, group: payload.source_group,
                    observed_at: payload.observed_at, teacher_feedback: payload.teacher_feedback,
                    scores, evidence_ids,
                  });
                  continue;
                }
                const evaluation = await resources.createEvaluation.mutateAsync(evaluationPayload);
                await resources.saveEvaluationDraft.mutateAsync({
                  evaluation: evaluation.id, scores, teacher_feedback: payload.teacher_feedback,
                  evidence_ids,
                });
              }
            }}
            onFinalize={async (evaluation) => {
              await resources.finalizeEvaluation.mutateAsync(evaluation.id);
            }}
          />
        ) : null}
      </ResponsiveActionSheet>
    </div>
  );
}

function GroupedProjectObservations({
  observations,
  tasks,
  deploymentId,
  onEdit,
  onDiscard,
  onAmend,
}: {
  observations: ProjectClassObservation[];
  tasks: ProjectTask[];
  deploymentId: number;
  onEdit: (item: ProjectClassObservation) => Promise<void>;
  onDiscard: (item: ProjectClassObservation) => Promise<void>;
  onAmend: (item: ProjectClassObservation) => Promise<void>;
}) {
  const group = (title: string, items: ProjectClassObservation[], taskId?: number) => {
    const drafts = items.filter((item) => item.status === 'DRAFT').length;
    const finalized = items.filter((item) => item.status === 'FINALIZED').length;
    const latest = [...items].sort((left, right) =>
      right.observed_at.localeCompare(left.observed_at),
    )[0];
    return (
      <section key={title} className="space-y-3 rounded-lg border theme-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold theme-text">{title}</h3>
            <p className="text-xs theme-muted">
              {items.length} observations · {drafts} draft · {finalized} finalized · Latest{' '}
              {latest ? new Date(latest.observed_at).toLocaleString() : '—'}
            </p>
          </div>
          {taskId ? (
            <Link
              className="theme-link text-sm"
              href={`/projects/${deploymentId}?tab=tasks&task=${taskId}`}
            >
              Open task workspace
            </Link>
          ) : null}
        </div>
        {items.length ? (
          items.map((item) => (
            <details key={item.id} className="rounded-lg border theme-border px-3 py-2">
              <summary className="cursor-pointer text-sm theme-text">
                {item.comment.slice(0, 120)}
                {item.comment.length > 120 ? '…' : ''}
              </summary>
              <div className="mt-2 space-y-1 text-sm theme-muted">
                <p>{item.comment}</p>
                <p>
                  Author: {item.author_name} · Status: {item.status}
                </p>
                <p>
                  Created: {new Date(item.created_at).toLocaleString()} · Observed:{' '}
                  {new Date(item.observed_at).toLocaleString()}
                  {item.finalized_at
                    ? ` · Finalized: ${new Date(item.finalized_at).toLocaleString()}`
                    : ''}
                </p>
                {item.supersedes ? (
                  <p>
                    Amends observation #{item.supersedes}: {item.amendment_reason}
                  </p>
                ) : null}
                {item.amendment_count ? (
                  <p>Superseded by {item.amendment_count} amendment(s).</p>
                ) : null}
                {item.authority?.locked_reason ? <p>{item.authority.locked_reason}</p> : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  {item.authority?.can_edit ? (
                    <Button size="sm" variant="secondary" onClick={() => void onEdit(item)}>Edit</Button>
                  ) : null}
                  {item.authority?.can_discard ? (
                    <Button size="sm" variant="secondary" onClick={() => void onDiscard(item)}>Discard</Button>
                  ) : null}
                  {item.authority?.can_amend ? (
                    <Button size="sm" variant="secondary" onClick={() => void onAmend(item)}>Amend</Button>
                  ) : null}
                </div>
              </div>
            </details>
          ))
        ) : (
          <p className="text-sm theme-muted">No observations.</p>
        )}
      </section>
    );
  };
  return (
    <div className="space-y-6">
      {group(
        'Project observations',
        observations.filter((item) => !item.task),
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold theme-text">Observations by task</h2>
        {tasks.map((task, index) =>
          group(
            `Task ${index + 1} — ${task.title}`,
            observations.filter((item) => item.task === task.id),
            task.id,
          ),
        )}
      </section>
    </div>
  );
}

function Row({ title, detail, icon }: { title: string; detail: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b theme-border py-3 last:border-0">
      <div>
        <p className="font-medium theme-text">{title}</p>
        <p className="text-sm theme-muted">{detail}</p>
      </div>
      {icon}
    </div>
  );
}
function ListState({
  query,
  empty,
  children,
}: {
  query: { isLoading: boolean; error: Error | null };
  empty: string;
  children: ReactNode;
}) {
  if (query.isLoading)
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner message="Loading project records…" fullScreen={false} />
      </div>
    );
  if (query.error)
    return (
      <AppErrorBanner
        error={resolveAppError(query.error, { domain: 'projects', action: 'load' })}
      />
    );
  return (
    <Card>
      {Children.count(children) ? (
        children
      ) : (
        <p className="py-8 text-center theme-muted">{empty}</p>
      )}
    </Card>
  );
}
