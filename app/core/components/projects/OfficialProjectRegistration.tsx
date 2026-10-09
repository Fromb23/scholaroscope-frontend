'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, LockKeyhole, Users } from 'lucide-react';
import { ResponsiveActionSheet } from '@/app/components/ui/actions';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { useToast } from '@/app/components/ui/toast/useToast';
import { projectsAPI } from '@/app/core/api/projects';
import { resolveAppError } from '@/app/core/errors';
import {
  useProjectMutationInvalidation,
  useRegisterOfficialProject,
} from '@/app/core/hooks/useProjects';
import type {
  EligibleProjectTarget,
  ProjectCatalogueAction,
  ProjectDefinitionVersion,
  RegisterOfficialProjectPayload,
} from '@/app/core/types/projects';
import { useAuth } from '@/app/context/AuthContext';
import { buildProjectDetailHref } from './projectNavigation';

const staleEligibilityCodes = new Set([
  'project_target_not_eligible',
  'project_target_not_authorized',
  'project_scope_not_found',
  'project_definition_not_published',
  'project_definition_ineligible',
  'project_definition_checksum_changed',
  'project_adoption_required',
  'project_adoption_revoked',
  'project_cbc_target_ineligible',
  'project_cbc_binding_missing',
]);

function localDateTimeValue(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

type OfficialProjectWorkflowAction = Extract<ProjectCatalogueAction, 'REGISTER' | 'DEPLOY'>;

export function actionableTargets(
  targets: EligibleProjectTarget[],
  action: OfficialProjectWorkflowAction,
): EligibleProjectTarget[] {
  return action === 'REGISTER'
    ? targets
    : targets.filter((target) => target.can_deploy);
}

export function initialEligibleTarget(
  targets: EligibleProjectTarget[],
  action: OfficialProjectWorkflowAction,
): string {
  const actionable = actionableTargets(targets, action);
  return actionable.length === 1 ? String(actionable[0].id) : '';
}

export function buildRegistrationPayload(
  targetId: string,
  startsAt: string,
  deadlineAt: string,
  instructorId: string,
): RegisterOfficialProjectPayload {
  return {
    cohort_subject: Number(targetId),
    starts_at: new Date(startsAt).toISOString(),
    deadline_at: new Date(deadlineAt).toISOString(),
    ...(instructorId ? { administering_instructor: Number(instructorId) } : {}),
  };
}

function formatDate(value: string, timezone?: string): string {
  return new Date(value).toLocaleString(undefined, timezone ? { timeZone: timezone } : undefined);
}

export function OfficialProjectRegistration({
  definition,
  action,
  returnTo,
  onClose,
  onEligibilityChanged,
}: {
  definition: ProjectDefinitionVersion;
  action: OfficialProjectWorkflowAction;
  returnTo: string;
  onClose: () => void;
  onEligibilityChanged: () => Promise<unknown>;
}) {
  const router = useRouter();
  const { activeOrg } = useAuth();
  const { showToast } = useToast();
  const register = useRegisterOfficialProject(definition.id);
  const invalidate = useProjectMutationInvalidation();
  const eligibleTargets = useMemo(
    () => actionableTargets(definition.eligible_cohort_subjects, action),
    [action, definition.eligible_cohort_subjects],
  );
  const [targetId, setTargetId] = useState(() => (
    initialEligibleTarget(definition.eligible_cohort_subjects, action)
  ));
  const schedule = definition.official_schedule;
  const [startsAt, setStartsAt] = useState(() => localDateTimeValue(schedule?.official_starts_at));
  const [deadlineAt, setDeadlineAt] = useState(() => localDateTimeValue(schedule?.official_deadline_at));
  const [instructorId, setInstructorId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [directDeployError, setDirectDeployError] = useState<unknown>(null);
  const [directDeployPending, setDirectDeployPending] = useState(false);
  const submittingRef = useRef(false);
  const idempotencyKey = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `project-registration-${Date.now()}-${Math.random()}`,
  );
  const selectedTarget = eligibleTargets.find((target) => target.id === Number(targetId));
  const requiresInstructor = Boolean(selectedTarget?.requires_instructor_selection);
  const fixedWindow = Boolean(schedule?.is_fixed_window);
  const error = register.error ?? directDeployError;
  const resolvedError = error
    ? resolveAppError(error, { domain: 'projects', action: 'create', entityLabel: 'official project deployment' })
    : null;
  const pending = register.isPending || directDeployPending;
  const canContinue = Boolean(
    selectedTarget && startsAt && deadlineAt && (!requiresInstructor || instructorId),
  );

  useEffect(() => {
    setInstructorId('');
  }, [targetId]);

  useEffect(() => {
    setInstructorId((currentInstructorId) => {
      if (!selectedTarget?.requires_instructor_selection) return '';
      if (selectedTarget.eligible_instructors.some(
        (instructor) => instructor.id === Number(currentInstructorId),
      )) {
        return currentInstructorId;
      }
      return '';
    });
    if (!selectedTarget) setConfirming(false);
  }, [selectedTarget]);

  useEffect(() => {
    setTargetId((currentTargetId) => {
      if (eligibleTargets.length === 1) return String(eligibleTargets[0].id);
      if (eligibleTargets.some((target) => target.id === Number(currentTargetId))) {
        return currentTargetId;
      }
      return '';
    });
  }, [eligibleTargets]);

  const submit = async () => {
    if (!selectedTarget || !canContinue || submittingRef.current) return;
    submittingRef.current = true;
    setDirectDeployPending(true);
    setDirectDeployError(null);
    try {
      const payload = buildRegistrationPayload(
        String(selectedTarget.id),
        startsAt,
        deadlineAt,
        requiresInstructor ? instructorId : '',
      );
      const deployment = action === 'REGISTER'
        ? (await register.mutateAsync({ payload, idempotencyKey: idempotencyKey.current })).deployment
        : await projectsAPI.createDeployment({
            definition_version: definition.id,
            cohort_subject: selectedTarget.id,
            academic_year: selectedTarget.academic_year,
            scheduled_start: startsAt.slice(0, 10),
            scheduled_end: deadlineAt.slice(0, 10),
            starts_at: payload.starts_at,
            deadline_at: payload.deadline_at,
            administering_instructor: payload.administering_instructor,
          });
      await invalidate();
      showToast({
        message: action === 'REGISTER'
          ? `${definition.title} was registered and deployed successfully.`
          : `${definition.title} was deployed successfully.`,
        severity: 'success',
      });
      router.push(buildProjectDetailHref(deployment.id, returnTo));
    } catch (caught) {
      if (action === 'DEPLOY') setDirectDeployError(caught);
      const appError = resolveAppError(caught, {
        domain: 'projects',
        action: 'create',
        entityLabel: 'official project deployment',
      });
      if (appError.serverCode && staleEligibilityCodes.has(appError.serverCode)) {
        await onEligibilityChanged();
        showToast({
          message: 'Project eligibility changed on the server. The catalogue has been refreshed.',
          severity: 'warning',
        });
      }
    } finally {
      submittingRef.current = false;
      setDirectDeployPending(false);
    }
  };

  return (
    <ResponsiveActionSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={confirming ? 'Register official project' : `${action === 'REGISTER' ? 'Register' : 'Deploy'} project`}
      description="The server will re-check permission, target eligibility, schedule and organization scope before creating anything."
      size="lg"
      state={pending ? 'loading' : resolvedError ? 'error' : confirming ? 'warning' : 'idle'}
      closeDisabled={pending}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={confirming ? () => setConfirming(false) : onClose} disabled={pending}>
            {confirming ? 'Back' : 'Cancel'}
          </Button>
          {!confirming ? (
            <Button type="button" disabled={!canContinue} onClick={() => setConfirming(true)}>
              Review registration
            </Button>
          ) : (
            <Button type="button" disabled={pending || !canContinue} onClick={() => void submit()}>
              {pending ? 'Registering…' : action === 'REGISTER' ? 'Register and deploy' : 'Deploy project'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {resolvedError ? <AppErrorBanner error={resolvedError} /> : null}
        <div className="grid gap-3 rounded-lg border theme-border p-4 text-sm sm:grid-cols-2">
          <Summary label="Project" value={definition.title} />
          <Summary label="Authority" value={definition.authority_key} />
          <Summary label="Curriculum" value={definition.curriculum_key} />
          <Summary label="Subject" value={definition.subject_key} />
          <Summary label="Level" value={definition.level_key} />
          <Summary label="Assessment year" value={String(definition.assessment_year)} />
          <Summary label="Version" value={String(definition.version)} />
          <Summary label="Maximum marks" value={definition.maximum_marks} />
          <Summary label="Tasks" value={String(definition.task_count ?? definition.tasks.length)} />
          <Summary label="Organization" value={activeOrg?.name ?? 'Current organization'} />
        </div>

        {!confirming ? (
          <>
            {eligibleTargets.length === 1 && selectedTarget ? (
              <div className="rounded-lg border theme-border p-4 text-sm">
                <p className="theme-subtle">Eligible teaching target</p>
                <p className="mt-1 font-medium theme-text">
                  {selectedTarget.cohort.name} — {selectedTarget.subject.name}
                </p>
                <p className="mt-1 text-xs theme-subtle">The only server-authorized target is preselected.</p>
              </div>
            ) : eligibleTargets.length > 1 ? (
              <Select
                label="Eligible teaching target"
                required
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                helperText="Choose one target returned by the server."
                options={[
                  { value: '', label: 'Choose an eligible target' },
                  ...eligibleTargets.map((target) => ({
                    value: target.id,
                    label: `${target.cohort.name} — ${target.subject.name}`,
                  })),
                ]}
              />
            ) : (
              <div role="alert" className="rounded-lg border border-[color:var(--color-danger)] p-4 text-sm">
                <p className="font-medium theme-text">Eligibility changed</p>
                <p className="mt-1 theme-muted">
                  No eligible teaching targets are currently available for this action.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => void onEligibilityChanged()}
                >
                  Refresh catalogue
                </Button>
              </div>
            )}
            {selectedTarget ? (
              <div className="rounded-lg theme-surface-muted p-4 text-sm theme-text">
                <p className="flex items-center gap-2 font-medium"><Users className="h-4 w-4" aria-hidden="true" />Current instructors affected</p>
                <p className="mt-1 theme-muted">
                  {selectedTarget.eligible_instructors.length
                    ? selectedTarget.eligible_instructors.map((instructor) => instructor.name).join(', ')
                    : 'No active instructor assignment was returned.'}
                </p>
                <p className="mt-2 theme-muted">Current eligible learner enrolments will be synchronized by the server after deployment.</p>
              </div>
            ) : null}
            {requiresInstructor && selectedTarget ? (
              <Select
                label="Lead instructor"
                required
                value={instructorId}
                onChange={(event) => setInstructorId(event.target.value)}
                options={[
                  { value: '', label: 'Choose the lead instructor' },
                  ...selectedTarget.eligible_instructors.map((instructor) => ({ value: instructor.id, label: instructor.name })),
                ]}
              />
            ) : null}
            <div className="rounded-lg border theme-border p-4">
              <p className="flex items-center gap-2 font-medium theme-text"><CalendarClock className="h-4 w-4" aria-hidden="true" />Official scheduling constraints</p>
              {fixedWindow ? (
                <p className="mt-1 flex items-center gap-2 text-sm theme-muted"><LockKeyhole className="h-4 w-4" aria-hidden="true" />The authority fixed both dates. They cannot be changed.</p>
              ) : (
                <p className="mt-1 text-sm theme-muted">
                  {schedule?.official_starts_at ? `Start cannot be before ${formatDate(schedule.official_starts_at)}. ` : ''}
                  {schedule?.official_deadline_at ? `Deadline cannot be after ${formatDate(schedule.official_deadline_at)}.` : 'The institution selects both dates.'}
                  {' '}Dates may span school terms; the server validates the official window.
                </p>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input label="Operational start" type="datetime-local" required value={startsAt} disabled={fixedWindow} min={localDateTimeValue(schedule?.official_starts_at)} onChange={(event) => setStartsAt(event.target.value)} />
                <Input label="Final deadline" type="datetime-local" required value={deadlineAt} disabled={fixedWindow} max={localDateTimeValue(schedule?.official_deadline_at)} onChange={(event) => setDeadlineAt(event.target.value)} />
              </div>
            </div>
          </>
        ) : selectedTarget ? (
          <div className="space-y-3 rounded-lg border theme-border p-4">
            <h3 className="text-lg font-semibold theme-text">Register official project</h3>
            <Summary label="Project" value={definition.title} />
            <Summary label="Institution" value={activeOrg?.name ?? 'Current organization'} />
            <Summary label="Target" value={`${selectedTarget.cohort.name} — ${selectedTarget.subject.name}`} />
            <Summary label="Starts" value={formatDate(startsAt)} />
            <Summary label="Final deadline" value={formatDate(deadlineAt)} />
            <Summary label="Current instructors affected" value={selectedTarget.eligible_instructors.length ? selectedTarget.eligible_instructors.map((item) => item.name).join(', ') : 'None returned'} />
            <Summary label="Current learners affected" value="Eligible active enrolments will be synchronized by the server" />
          </div>
        ) : null}
      </div>
    </ResponsiveActionSheet>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <p><span className="theme-subtle">{label}:</span> <strong className="theme-text">{value}</strong></p>;
}
