'use client';

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Children, useState, type ReactNode } from 'react';
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
import {
  useProjectAction,
  useProjectDeployment,
  useProjectRelated,
  useProjectResourceMutations,
} from '@/app/core/hooks/useProjects';
import {
  canShowProjectEvaluationControls,
  getProjectLifecycleActions,
  type ProjectLifecycleAction,
} from './projectAuthority';
import {
  ProjectCriteriaForm,
  ProjectEvaluationForm,
  ProjectEvidenceForm,
} from './ProjectWorkForms';

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
  const [workAction, setWorkAction] = useState<'evidence' | 'evaluation' | null>(null);
  const [groupName, setGroupName] = useState('');
  const [scoringEvaluationId, setScoringEvaluationId] = useState<number | null>(null);
  const [observationTask, setObservationTask] = useState(searchParams.get('task') ?? '');
  const [observationComment, setObservationComment] = useState('');
  const project = deploymentQuery.data;
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
  const setTab = (tab: Tab) => {
    router.replace(buildProjectWorkspaceHref(id, searchParams, tab), { scroll: false });
  };
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
          {project.authority.can_manage ? (
            <Button variant="secondary" size="sm" onClick={() => setTab('participants')}>
              Manage participants
            </Button>
          ) : null}
          {project.authority.can_record_evidence ? (
            <Button variant="secondary" size="sm" onClick={() => setWorkAction('evidence')}>
              Record evidence
            </Button>
          ) : null}
          {canShowProjectEvaluationControls(project.authority) ? (
            <Button variant="secondary" size="sm" onClick={() => setWorkAction('evaluation')}>
              Evaluate criteria
            </Button>
          ) : null}
          {lifecycleActions.map((action) => (
            <Button
              key={action}
              variant={action === 'cancel' ? 'danger' : 'primary'}
              size="sm"
              onClick={() => setPendingAction(action)}
            >
              {label(action)}
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <p className="text-sm theme-subtle">Participants</p>
            <p className="text-2xl font-bold theme-text">{project.participant_count}</p>
          </Card>
          <Card>
            <p className="text-sm theme-subtle">Task completion</p>
            <p className="text-2xl font-bold theme-text">
              {project.progress.completed_task_count}/{project.progress.task_count}
            </p>
          </Card>
          <Card>
            <p className="text-sm theme-subtle">Evidence</p>
            <p className="text-2xl font-bold theme-text">{project.progress.evidence_count}</p>
          </Card>
          <Card>
            <p className="text-sm theme-subtle">Readiness</p>
            <p className="text-lg font-bold theme-text">{label(project.readiness.state)}</p>
          </Card>
        </div>
      ) : null}

      {activeTab === 'tasks' ? (
        <div className="space-y-4">
          {project.definition?.tasks.map((task) => (
            <Card key={task.id}>
              <div className="flex justify-between gap-3">
                <div>
                  <h2 className="font-semibold theme-text">
                    {task.code}. {task.title}
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm theme-muted">
                    {task.instructions}
                  </p>
                </div>
                <Badge>{task.maximum_marks} marks</Badge>
              </div>
              <div className="mt-4 space-y-2">
                {task.steps.map((step) => (
                  <div key={step.id} className="rounded-lg border theme-border p-3">
                    <p className="font-medium theme-text">
                      {step.number} {step.title}
                    </p>
                    <p className="text-sm theme-muted">{step.instructions}</p>
                  </div>
                ))}
              </div>
              {task.curriculum_mappings.length ? (
                <p className="mt-4 text-sm theme-muted">
                  Outcome coverage: {task.curriculum_mappings.map((mapping) => {
                    const snapshot = mapping.reference_snapshot as { code?: string } | undefined;
                    return snapshot?.code ?? String(mapping.reference_id ?? 'Mapped outcome');
                  }).join(', ')}
                </p>
              ) : null}
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {task.criteria.map((criterion) => (
                  <div key={criterion.id} className="rounded-lg theme-surface-elevated p-3 text-sm">
                    <strong>{criterion.code}</strong> · {criterion.description} (
                    {criterion.maximum_marks})
                    {criterion.curriculum_mappings.length ? (
                      <p className="mt-1 text-xs theme-muted">
                        Outcome: {criterion.curriculum_mappings.map((mapping) => mapping.reference_snapshot.code ?? mapping.reference_id).join(', ')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : null}
      {activeTab === 'participants' ? (
        <ListState query={related.participants} empty="No participants captured.">
          {(related.participants.data ?? []).map((item) => (
            <Row
              key={item.id}
              title={item.learner_name}
              detail={`${item.status}${item.is_late_addition ? ' · Late addition' : ''}`}
              icon={
                project.authority.can_manage && item.status === 'ACTIVE' ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => resources.withdrawParticipant.mutate(item.id)}
                  >
                    Withdraw
                  </Button>
                ) : null
              }
            />
          ))}
          {project.authority.can_manage
            ? (related.eligible.data ?? []).map((item) => (
                <Row
                  key={`eligible-${item.subject_enrollment}`}
                  title={item.learner_name}
                  detail="Eligible late participant"
                  icon={
                    <Button
                      size="sm"
                      onClick={() => resources.addParticipant.mutate(item.subject_enrollment)}
                    >
                      Add
                    </Button>
                  }
                />
              ))
            : null}
        </ListState>
      ) : null}
      {activeTab === 'groups' ? (
        <ListState query={related.groups} empty="No groups created.">
          {project.authority.can_manage ? (
            <form
              className="mb-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (groupName.trim())
                  resources.createGroup.mutate(groupName.trim(), {
                    onSuccess: () => setGroupName(''),
                  });
              }}
            >
              <Input
                aria-label="Group name"
                placeholder="New group name"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
              />
              <Button type="submit" disabled={!groupName.trim() || resources.createGroup.isPending}>
                Create group
              </Button>
            </form>
          ) : null}
          {(related.groups.data ?? []).map((item) => (
            <Row key={item.id} title={item.name} detail={`${item.members.length} members`} />
          ))}
        </ListState>
      ) : null}
      {activeTab === 'evidence' ? (
        <ListState query={related.evidence} empty="No evidence recorded.">
          {(related.evidence.data ?? []).map((item) => (
            <Row
              key={item.id}
              title={label(item.evidence_type)}
              detail={`Task ${item.task} · ${new Date(item.observed_at).toLocaleString()}`}
            />
          ))}
        </ListState>
      ) : null}
      {activeTab === 'observations' ? (
        <ListState query={related.observations} empty="No class observations recorded.">
          {project.authority.can_administer ? (
            <form
              className="mb-4 space-y-3 rounded-lg border theme-border p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void resources.createClassObservation.mutateAsync({
                  task: observationTask ? Number(observationTask) : undefined,
                  comment: observationComment,
                  observed_at: new Date().toISOString(),
                }).then(() => setObservationComment(''));
              }}
            >
              <h2 className="font-semibold theme-text">Class observation</h2>
              <p className="text-sm theme-muted">Project or task context only. It is not copied into individual learner evidence.</p>
              <Select
                label="Project or task"
                value={observationTask}
                onChange={(event) => setObservationTask(event.target.value)}
                options={[
                  { value: '', label: 'Whole project' },
                  ...(project.definition?.tasks ?? []).map((task) => ({ value: task.id, label: `${task.code}. ${task.title}` })),
                ]}
              />
              <label className="block text-sm font-medium theme-text">Class observation
                <textarea className="theme-input mt-1 min-h-24 w-full rounded-lg px-3 py-2" required value={observationComment} onChange={(event) => setObservationComment(event.target.value)} />
              </label>
              <Button type="submit" disabled={!observationComment.trim() || resources.createClassObservation.isPending}>Record observation</Button>
            </form>
          ) : null}
          {(related.observations.data ?? []).map((item) => (
            <Row
              key={item.id}
              title={item.task ? `Task ${item.task} class observation` : 'Project class observation'}
              detail={`${item.comment} · ${item.author_name} · ${new Date(item.observed_at).toLocaleString()} · ${item.status}`}
              icon={project.authority.can_administer && item.status === 'DRAFT' ? (
                <Button size="sm" onClick={() => resources.finalizeClassObservation.mutate(item.id)}>Finalize</Button>
              ) : null}
            />
          ))}
        </ListState>
      ) : null}
      {activeTab === 'evaluations' ? (
        <ListState query={related.evaluations} empty="No task evaluations recorded.">
          {(related.evaluations.data ?? []).map((item) => (
            <div
              key={item.id}
              className={selectedTask === item.task && selectedParticipant === item.participant ? 'rounded-lg px-2 ring-2 ring-blue-500' : ''}
            >
            <Row
              title={`Participant ${item.participant} · Task ${item.task}`}
              detail={`${item.status} · ${item.derived_score} · Learner feedback: ${item.teacher_feedback || 'None'} · Projection: ${item.evidence_projection_status}${item.evidence_projection_warning ? ` (${item.evidence_projection_warning})` : ''}`}
              icon={
                project.authority.can_evaluate && item.status !== 'FINALIZED' ? (
                  <Button size="sm" onClick={() => setScoringEvaluationId(item.id)}>
                    Score criteria
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
              disabled={mutation.isPending || (pendingAction === 'cancel' && !cancelReason.trim())}
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
        onOpenChange={(open) => !open && setWorkAction(null)}
        title={workAction === 'evidence' ? 'Record project evidence' : 'Create task evaluation'}
        description="The server validates project scope, responsibility and lifecycle before saving."
        size="lg"
      >
        {resources.recordEvidence.error || resources.createEvaluation.error ? (
          <AppErrorBanner
            error={resolveAppError(
              resources.recordEvidence.error ?? resources.createEvaluation.error,
              {
                domain: 'projects',
                action: 'create',
                entityLabel: workAction === 'evidence' ? 'project evidence' : 'task evaluation',
              },
            )}
            className="mb-4"
          />
        ) : null}
        {workAction === 'evidence' ? (
          <ProjectEvidenceForm
            project={project}
            participants={related.participants.data ?? []}
            groups={related.groups.data ?? []}
            pending={resources.recordEvidence.isPending}
            onCancel={() => setWorkAction(null)}
            onSubmit={async (payload) => {
              await resources.recordEvidence.mutateAsync(payload);
              setWorkAction(null);
              setTab('evidence');
            }}
          />
        ) : null}
        {workAction === 'evaluation' ? (
          <ProjectEvaluationForm
            project={project}
            participants={related.participants.data ?? []}
            groups={related.groups.data ?? []}
            pending={resources.createEvaluation.isPending}
            onCancel={() => setWorkAction(null)}
            onSubmit={async (payload) => {
              await resources.createEvaluation.mutateAsync(payload);
              setWorkAction(null);
              setTab('evaluations');
            }}
          />
        ) : null}
      </ResponsiveActionSheet>
      <ResponsiveActionSheet
        open={Boolean(scoringEvaluationId)}
        onOpenChange={(open) => !open && setScoringEvaluationId(null)}
        title="Score project criteria"
        description="Award marks against the definition criteria. Maximum marks remain server-enforced."
        size="lg"
      >
        {resources.recordCriterionScore.error ? (
          <AppErrorBanner
            error={resolveAppError(resources.recordCriterionScore.error, {
              domain: 'projects',
              action: 'update',
              entityLabel: 'criterion score',
            })}
            className="mb-4"
          />
        ) : null}
        {scoringEvaluationId
          ? (() => {
              const evaluation = (related.evaluations.data ?? []).find(
                (item) => item.id === scoringEvaluationId,
              );
              return evaluation ? (
                <ProjectCriteriaForm
                  project={project}
                  evaluation={evaluation}
                  pending={resources.recordCriterionScore.isPending}
                  onCancel={() => setScoringEvaluationId(null)}
                  onSubmit={async (scores) => {
                    for (const score of scores)
                      await resources.recordCriterionScore.mutateAsync({
                        evaluation: evaluation.id,
                        ...score,
                      });
                    setScoringEvaluationId(null);
                  }}
                />
              ) : null;
            })()
          : null}
      </ResponsiveActionSheet>
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
