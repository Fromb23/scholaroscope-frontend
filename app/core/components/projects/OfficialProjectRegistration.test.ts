import React, { createElement } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EligibleProjectTarget, ProjectDefinitionVersion } from '@/app/core/types/projects';
import { actionableTargets, OfficialProjectRegistration } from './OfficialProjectRegistration';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(async () => undefined),
  mutateAsync: vi.fn(),
  refresh: vi.fn(async () => undefined),
  routerPush: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.routerPush }) }));
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
  }) =>
    createElement(
      'section',
      null,
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

const instructor = {
  id: 17,
  name: 'Assigned Teacher',
  email: 'assigned@example.test',
  eligible: true,
};

function target(
  id: number,
  name: string,
  overrides: Partial<EligibleProjectTarget> = {},
): EligibleProjectTarget {
  return {
    id,
    cohort: { id: id + 100, name },
    subject: { id: 3, name: 'Computer Studies' },
    academic_year: 2026,
    deployment_exists: false,
    deployment_id: null,
    deployment_status: null,
    can_deploy: true,
    deployment_blockers: [],
    eligible_instructors: [instructor],
    requires_instructor_selection: false,
    auto_selected_instructor: instructor,
    ...overrides,
  };
}

function definition(targets: EligibleProjectTarget[]): ProjectDefinitionVersion {
  return {
    id: 41,
    title: 'Computer Studies SBA Practical',
    subject_key: 'Computer Studies',
    level_key: 'Grade 10',
    assessment_year: 2026,
    eligible_cohort_subjects: targets,
    official_schedule: null,
  } as unknown as ProjectDefinitionVersion;
}

function textContent(node: ReactTestInstance): string {
  return node.children
    .map((child) => (typeof child === 'string' ? child : textContent(child)))
    .join('');
}

function button(root: ReactTestInstance, label: string) {
  return root.findAll((node) => node.type === 'button' && textContent(node) === label)[0];
}

describe('multi-stream official project registration', () => {
  let renderer: ReactTestRenderer | null = null;

  beforeEach(() => {
    mocks.invalidate.mockClear();
    mocks.mutateAsync.mockReset().mockResolvedValue({ deployments: [{ id: 73 }, { id: 74 }] });
    mocks.refresh.mockClear();
    mocks.routerPush.mockClear();
  });
  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = null;
  });

  it('excludes already deployed targets from an add-missing-streams command', () => {
    const existing = target(1, 'Stream A', {
      deployment_exists: true,
      deployment_id: 9,
      deployment_status: 'PUBLISHED',
      can_deploy: false,
    });
    const missing = target(2, 'Stream B');
    expect(actionableTargets([existing, missing], 'DEPLOY')).toEqual([missing]);
  });

  it('submits all missing streams as one idempotent command and opens the project aggregate', async () => {
    await act(async () => {
      renderer = create(
        createElement(OfficialProjectRegistration, {
          definition: definition([target(91, 'Stream A'), target(92, 'Stream B')]),
          action: 'REGISTER',
          returnTo: '/projects/catalogue',
          onClose: vi.fn(),
          onEligibilityChanged: mocks.refresh,
        }),
      );
    });
    const inputs = renderer!.root.findAllByType('input');
    await act(async () => {
      inputs[0].props.onChange({ target: { value: '2026-02-01T08:00' } });
      inputs[1].props.onChange({ target: { value: '2026-10-01T17:00' } });
    });
    await act(async () => button(renderer!.root, 'Review registration').props.onClick());
    await act(async () => button(renderer!.root, 'Register and deploy').props.onClick());
    expect(mocks.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          targets: [{ cohort_subject: 91 }, { cohort_subject: 92 }],
        }),
        idempotencyKey: expect.any(String),
      }),
    );
    expect(mocks.routerPush).toHaveBeenCalledWith(
      '/projects/definitions/41?returnTo=%2Fprojects%2Fcatalogue',
    );
  });

  it('requires an explicit instructor independently for each ambiguous stream', async () => {
    const second = { id: 21, name: 'Second Teacher', email: 'second@example.test', eligible: true };
    await act(async () => {
      renderer = create(
        createElement(OfficialProjectRegistration, {
          definition: definition([
            target(91, 'Stream A', {
              eligible_instructors: [instructor, second],
              requires_instructor_selection: true,
              auto_selected_instructor: null,
            }),
          ]),
          action: 'REGISTER',
          returnTo: '/projects',
          onClose: vi.fn(),
          onEligibilityChanged: mocks.refresh,
        }),
      );
    });
    const root = renderer!.root;
    expect(button(root, 'Review registration').props.disabled).toBe(true);
    const inputs = root.findAllByType('input');
    await act(async () => {
      inputs[0].props.onChange({ target: { value: '2026-02-01T08:00' } });
      inputs[1].props.onChange({ target: { value: '2026-10-01T17:00' } });
      root.findByType('select').props.onChange({ target: { value: '21' } });
    });
    await act(async () => button(root, 'Review registration').props.onClick());
    await act(async () => button(root, 'Register and deploy').props.onClick());
    expect(mocks.mutateAsync.mock.calls[0][0].payload.targets).toEqual([
      { cohort_subject: 91, administering_instructor: 21 },
    ]);
  });

  it('shows per-stream blockers and prevents a partial launch', async () => {
    await act(async () => {
      renderer = create(
        createElement(OfficialProjectRegistration, {
          definition: definition([
            target(91, 'Stream A'),
            target(92, 'Stream B', {
              can_deploy: false,
              deployment_blockers: [
                {
                  code: 'project_administering_instructor_required',
                  message: 'Assign an instructor to Stream B.',
                },
              ],
            }),
          ]),
          action: 'REGISTER',
          returnTo: '/projects',
          onClose: vi.fn(),
          onEligibilityChanged: mocks.refresh,
        }),
      );
    });
    expect(textContent(renderer!.root)).toContain('Assign an instructor to Stream B.');
    expect(button(renderer!.root, 'Review registration').props.disabled).toBe(true);
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });
});
