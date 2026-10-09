import React, { createElement } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectsAPI } from '@/app/core/api/projects';
import { resolveAppError } from '@/app/core/errors';
import type {
  EligibleProjectTarget,
  ProjectCatalogueAction,
  ProjectDefinitionVersion,
} from '@/app/core/types/projects';
import {
  actionableTargets,
  OfficialProjectRegistration,
  initialEligibleTarget,
} from './OfficialProjectRegistration';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(async () => undefined),
  mutateAsync: vi.fn(),
  onEligibilityChanged: vi.fn(async () => undefined),
  routerPush: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('@/app/components/ui/actions', () => ({
  ResponsiveActionSheet: ({
    title,
    description,
    children,
    footer,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
    footer: React.ReactNode;
  }) => createElement('section', null,
    createElement('h1', null, title),
    createElement('p', null, description),
    children,
    footer,
  ),
}));

vi.mock('@/app/components/ui/toast/useToast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({ activeOrg: { id: 5, name: 'Olympic High School' } }),
}));

vi.mock('@/app/core/hooks/useProjects', () => ({
  useProjectMutationInvalidation: () => mocks.invalidate,
  useRegisterOfficialProject: () => ({
    error: null,
    isPending: false,
    mutateAsync: mocks.mutateAsync,
  }),
}));

vi.mock('@/app/core/api/projects', () => ({
  projectsAPI: { createDeployment: vi.fn() },
}));

function target(id: number, grade: string, canDeploy: boolean): EligibleProjectTarget {
  return {
    id,
    cohort: { id: id + 100, name: grade },
    subject: { id: 3, name: 'Computer Studies' },
    academic_year: 2026,
    can_deploy: canDeploy,
    eligible_instructors: [],
    requires_instructor_selection: false,
  };
}

function definition(
  targets: EligibleProjectTarget[],
  actions: ProjectDefinitionVersion['available_actions'],
): ProjectDefinitionVersion {
  return {
    id: 41,
    title: 'Computer Studies SBA Practical',
    curriculum_key: 'CBC',
    authority_key: 'KNEC',
    subject_key: 'Computer Studies',
    level_key: 'Grade 10',
    assessment_year: 2026,
    version: 1,
    maximum_marks: '100.00',
    task_count: 3,
    tasks: [],
    eligible_cohort_subjects: targets,
    available_actions: actions,
    official_schedule: null,
  } as unknown as ProjectDefinitionVersion;
}

function textContent(node: ReactTestInstance): string {
  return node.children.map((child) => (
    typeof child === 'string' ? child : textContent(child)
  )).join('');
}

function button(root: ReactTestInstance, label: string): ReactTestInstance {
  return root.findAll((node) => node.type === 'button' && textContent(node) === label)[0];
}

async function renderRegistration(
  projectDefinition: ProjectDefinitionVersion,
  action: Extract<ProjectCatalogueAction, 'REGISTER' | 'DEPLOY'>,
) {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(createElement(OfficialProjectRegistration, {
      definition: projectDefinition,
      action,
      returnTo: '/projects/catalogue',
      onClose: vi.fn(),
      onEligibilityChanged: mocks.onEligibilityChanged,
    }));
  });
  return renderer!;
}

async function enterValidSchedule(root: ReactTestInstance) {
  const inputs = root.findAllByType('input');
  await act(async () => {
    inputs[0].props.onChange({ target: { value: '2026-02-01T08:00' } });
    inputs[1].props.onChange({ target: { value: '2026-10-01T17:00' } });
  });
}

async function reviewAndSubmit(root: ReactTestInstance, submitLabel: string) {
  await act(async () => button(root, 'Review registration').props.onClick());
  await act(async () => button(root, submitLabel).props.onClick());
}

describe('official project registration contract', () => {
  let renderer: ReactTestRenderer | null = null;

  beforeEach(() => {
    mocks.invalidate.mockClear();
    mocks.mutateAsync.mockReset().mockResolvedValue({ deployment: { id: 73 } });
    mocks.onEligibilityChanged.mockClear();
    mocks.routerPush.mockClear();
    mocks.showToast.mockClear();
    vi.mocked(projectsAPI.createDeployment).mockReset().mockResolvedValue({ id: 74 } as never);
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = null;
  });

  it('keeps a non-deployable server target actionable and selected for REGISTER', async () => {
    const olympicTarget = target(847, 'Grade 10', false);
    expect(actionableTargets([olympicTarget], 'REGISTER')).toEqual([olympicTarget]);
    expect(initialEligibleTarget([olympicTarget], 'REGISTER')).toBe('847');

    renderer = await renderRegistration(definition([olympicTarget], ['REGISTER']), 'REGISTER');
    const root = renderer.root;
    expect(textContent(root)).toContain('Eligible teaching target');
    expect(textContent(root)).toContain('Grade 10 — Computer Studies');
    expect(root.findAllByType('select')).toHaveLength(0);
    expect(button(root, 'Review registration').props.disabled).toBe(true);

    await enterValidSchedule(root);
    expect(button(root, 'Review registration').props.disabled).toBe(false);
    await reviewAndSubmit(root, 'Register and deploy');

    expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ cohort_subject: 847 }),
    }));
    expect(mocks.mutateAsync.mock.calls[0][0].payload).not.toHaveProperty(
      'administering_instructor',
    );
  });

  it('keeps direct DEPLOY strict when the target cannot be deployed', async () => {
    const unauthorizedTarget = target(847, 'Grade 10', false);
    expect(actionableTargets([unauthorizedTarget], 'DEPLOY')).toEqual([]);
    expect(initialEligibleTarget([unauthorizedTarget], 'DEPLOY')).toBe('');

    renderer = await renderRegistration(definition([unauthorizedTarget], ['DEPLOY']), 'DEPLOY');
    const root = renderer.root;
    expect(textContent(root.findByProps({ role: 'alert' }))).toContain('Eligibility changed');
    expect(root.findAllByType('select')).toHaveLength(0);
    expect(button(root, 'Review registration').props.disabled).toBe(true);
    expect(projectsAPI.createDeployment).not.toHaveBeenCalled();
  });

  it('renders every REGISTER target, preserves an explicit selection, and submits its identifier', async () => {
    const targets = [target(847, 'Grade 10', false), target(912, 'Grade 11', false)];
    const initialDefinition = definition(targets, ['REGISTER']);
    renderer = await renderRegistration(initialDefinition, 'REGISTER');
    let root = renderer.root;
    const targetSelect = root.findByType('select');

    expect(targetSelect.props.value).toBe('');
    expect(textContent(targetSelect)).toContain('Grade 10 — Computer Studies');
    expect(textContent(targetSelect)).toContain('Grade 11 — Computer Studies');
    await act(async () => targetSelect.props.onChange({ target: { value: '912' } }));

    await act(async () => {
      renderer!.update(createElement(OfficialProjectRegistration, {
        definition: definition([...targets], ['REGISTER']),
        action: 'REGISTER',
        returnTo: '/projects/catalogue',
        onClose: vi.fn(),
        onEligibilityChanged: mocks.onEligibilityChanged,
      }));
    });
    root = renderer.root;
    expect(root.findByType('select').props.value).toBe('912');

    await enterValidSchedule(root);
    await reviewAndSubmit(root, 'Register and deploy');
    expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ cohort_subject: 912 }),
    }));
  });

  it('clears stale selections and auto-selects a newly singular current target', async () => {
    const first = target(847, 'Grade 10', false);
    const second = target(912, 'Grade 11', false);
    renderer = await renderRegistration(definition([first, second], ['REGISTER']), 'REGISTER');
    await act(async () => renderer!.root.findByType('select').props.onChange({ target: { value: '912' } }));

    await act(async () => {
      renderer!.update(createElement(OfficialProjectRegistration, {
        definition: definition([first], ['REGISTER']),
        action: 'REGISTER',
        returnTo: '/projects/catalogue',
        onClose: vi.fn(),
        onEligibilityChanged: mocks.onEligibilityChanged,
      }));
    });

    expect(renderer.root.findAllByType('select')).toHaveLength(0);
    expect(textContent(renderer.root)).toContain('Grade 10 — Computer Studies');
  });

  it('renders an explicit zero-target recovery state and prevents review or submission', async () => {
    renderer = await renderRegistration(definition([], ['REGISTER']), 'REGISTER');
    const root = renderer.root;

    expect(textContent(root.findByProps({ role: 'alert' }))).toContain(
      'No eligible teaching targets are currently available for this action.',
    );
    expect(button(root, 'Review registration').props.disabled).toBe(true);
    await act(async () => button(root, 'Refresh catalogue').props.onClick());
    expect(mocks.onEligibilityChanged).toHaveBeenCalledOnce();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['project_target_not_eligible', 'Teaching target is no longer eligible.'],
    ['project_definition_not_published', 'Official project is no longer published.'],
    ['project_deployment_conflict', 'A deployment already exists.'],
    ['project_schedule_invalid', 'Project schedule is invalid.'],
    ['project_schedule_outside_official_window', 'Schedule is outside the official window.'],
    ['project_adoption_revoked', 'Institutional registration was revoked.'],
    ['project_cross_organization_target', 'Teaching target is outside this organization.'],
    ['project_deployment_transition_invalid', 'Project deployment is closed for this action.'],
  ])('maps server domain error %s to useful copy', (code, title) => {
    const error = resolveAppError(
      { response: { status: 400, data: { error: { code, message: 'Server message' } } } },
      { domain: 'projects', action: 'create' },
    );
    expect(error.title).toBe(title);
  });
});
