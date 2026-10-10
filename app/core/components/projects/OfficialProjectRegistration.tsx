'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, LockKeyhole, Users } from 'lucide-react';
import { ResponsiveActionSheet } from '@/app/components/ui/actions';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { useToast } from '@/app/components/ui/toast/useToast';
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
import { buildProjectDefinitionHref } from './projectNavigation';

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
  'project_administering_instructor_required',
  'project_administering_instructor_selection_required',
  'project_administering_instructor_invalid',
  'project_registration_blocked',
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
  void action;
  return targets.filter((target) => !target.deployment_exists);
}

// Retained for callers during the transition from the old single-target flow.
export function initialEligibleTarget(
  targets: EligibleProjectTarget[],
  action: OfficialProjectWorkflowAction,
): string {
  const actionable = actionableTargets(targets, action);
  return actionable.length === 1 ? String(actionable[0].id) : '';
}

export function buildRegistrationPayload(
  targets: EligibleProjectTarget[],
  startsAt: string,
  deadlineAt: string,
  instructorSelections: Record<number, string>,
): RegisterOfficialProjectPayload {
  return {
    targets: targets.map((target) => ({
      cohort_subject: target.id,
      ...(instructorSelections[target.id]
        ? { administering_instructor: Number(instructorSelections[target.id]) }
        : {}),
    })),
    starts_at: new Date(startsAt).toISOString(),
    deadline_at: new Date(deadlineAt).toISOString(),
  };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
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
  const targets = useMemo(
    () => actionableTargets(definition.eligible_cohort_subjects, action),
    [action, definition.eligible_cohort_subjects],
  );
  const schedule = definition.official_schedule;
  const [startsAt, setStartsAt] = useState(() => localDateTimeValue(schedule?.official_starts_at));
  const [deadlineAt, setDeadlineAt] = useState(() =>
    localDateTimeValue(schedule?.official_deadline_at),
  );
  const [instructorSelections, setInstructorSelections] = useState<Record<number, string>>({});
  const [confirming, setConfirming] = useState(false);
  const submittingRef = useRef(false);
  const idempotencyKey = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `project-registration-${Date.now()}-${Math.random()}`,
  );
  const fixedWindow = Boolean(schedule?.is_fixed_window);
  const resolvedError = register.error
    ? resolveAppError(register.error, {
        domain: 'projects',
        action: 'create',
        entityLabel: 'official project deployments',
      })
    : null;
  const canContinue = Boolean(
    targets.length &&
    startsAt &&
    deadlineAt &&
    targets.every(
      (target) =>
        target.can_deploy &&
        (!target.requires_instructor_selection || instructorSelections[target.id]),
    ),
  );

  const submit = async () => {
    if (!canContinue || submittingRef.current) return;
    submittingRef.current = true;
    try {
      await register.mutateAsync({
        payload: buildRegistrationPayload(targets, startsAt, deadlineAt, instructorSelections),
        idempotencyKey: idempotencyKey.current,
      });
      await invalidate();
      showToast({
        message: `${definition.title} was deployed to ${targets.length} ${targets.length === 1 ? 'stream' : 'streams'}.`,
        severity: 'success',
      });
      router.push(buildProjectDefinitionHref(definition.id, returnTo));
    } catch (caught) {
      const appError = resolveAppError(caught, { domain: 'projects', action: 'create' });
      if (appError.serverCode && staleEligibilityCodes.has(appError.serverCode)) {
        await onEligibilityChanged();
        showToast({
          message: 'Project eligibility changed on the server. The catalogue has been refreshed.',
          severity: 'warning',
        });
      }
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <ResponsiveActionSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={
        confirming
          ? 'Confirm stream deployments'
          : `${action === 'REGISTER' ? 'Register' : 'Add streams'}`
      }
      description="All selected streams are validated and created as one atomic server command."
      size="lg"
      state={
        register.isPending ? 'loading' : resolvedError ? 'error' : confirming ? 'warning' : 'idle'
      }
      closeDisabled={register.isPending}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={confirming ? () => setConfirming(false) : onClose}
            disabled={register.isPending}
          >
            {confirming ? 'Back' : 'Cancel'}
          </Button>
          {!confirming ? (
            <Button type="button" disabled={!canContinue} onClick={() => setConfirming(true)}>
              Review registration
            </Button>
          ) : (
            <Button
              type="button"
              disabled={register.isPending || !canContinue}
              onClick={() => void submit()}
            >
              {register.isPending
                ? 'Registering…'
                : action === 'REGISTER'
                  ? 'Register and deploy'
                  : 'Add missing streams'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {resolvedError ? <AppErrorBanner error={resolvedError} /> : null}
        <div className="grid gap-3 rounded-lg border theme-border p-4 text-sm sm:grid-cols-2">
          <Summary label="Project" value={definition.title} />
          <Summary label="Organization" value={activeOrg?.name ?? 'Current organization'} />
          <Summary label="Subject" value={definition.subject_key} />
          <Summary label="Level" value={definition.level_key} />
          <Summary label="Assessment year" value={String(definition.assessment_year)} />
          <Summary label="Streams in this command" value={String(targets.length)} />
        </div>

        {!targets.length ? (
          <div
            role="alert"
            className="rounded-lg border border-[color:var(--color-danger)] p-4 text-sm"
          >
            <p className="font-medium theme-text">No missing eligible streams</p>
            <p className="mt-1 theme-muted">
              Every visible eligible stream is already deployed, or eligibility changed.
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
        ) : (
          <div className="space-y-3">
            {targets.map((target) => (
              <div key={target.id} className="rounded-lg border theme-border p-4 text-sm">
                <p className="flex items-center gap-2 font-medium theme-text">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  {target.cohort.name} — {target.subject.name}
                </p>
                {target.deployment_blockers.map((blocker) => (
                  <p
                    key={blocker.code}
                    role="alert"
                    className="mt-2 text-[color:var(--color-danger)]"
                  >
                    {blocker.message}
                  </p>
                ))}
                {target.requires_instructor_selection ? (
                  <Select
                    label="Responsible instructor"
                    required
                    value={instructorSelections[target.id] ?? ''}
                    onChange={(event) =>
                      setInstructorSelections((current) => ({
                        ...current,
                        [target.id]: event.target.value,
                      }))
                    }
                    options={[
                      { value: '', label: 'Choose the instructor' },
                      ...target.eligible_instructors.map((instructor) => ({
                        value: instructor.id,
                        label: instructor.name,
                      })),
                    ]}
                  />
                ) : target.auto_selected_instructor ? (
                  <p className="mt-2 theme-muted">
                    Responsible instructor: {target.auto_selected_instructor.name}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border theme-border p-4">
          <p className="flex items-center gap-2 font-medium theme-text">
            <CalendarClock className="h-4 w-4" aria-hidden="true" /> Project schedule
          </p>
          {fixedWindow ? (
            <p className="mt-1 flex items-center gap-2 text-sm theme-muted">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              The authority fixed this window.
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Operational start"
              type="datetime-local"
              required
              value={startsAt}
              disabled={fixedWindow}
              onChange={(event) => setStartsAt(event.target.value)}
            />
            <Input
              label="Final deadline"
              type="datetime-local"
              required
              value={deadlineAt}
              disabled={fixedWindow}
              onChange={(event) => setDeadlineAt(event.target.value)}
            />
          </div>
        </div>

        {confirming ? (
          <div className="rounded-lg theme-surface-muted p-4 text-sm">
            <p className="font-medium theme-text">
              This will deploy {targets.length} independent stream{' '}
              {targets.length === 1 ? 'workspace' : 'workspaces'}.
            </p>
            <p className="mt-1 theme-muted">
              {formatDate(startsAt)} – {formatDate(deadlineAt)}
            </p>
          </div>
        ) : null}
      </div>
    </ResponsiveActionSheet>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="theme-subtle">{label}:</span> <strong className="theme-text">{value}</strong>
    </p>
  );
}
