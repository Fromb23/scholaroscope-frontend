import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectDefinitionVersion } from '@/app/core/types/projects';
import {
  eligibleTargetLabel,
  ProjectCatalogueCard,
} from './ProjectCatalogueCard';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

function definition(actions: ProjectDefinitionVersion['available_actions']): ProjectDefinitionVersion {
  return {
    id: 41,
    title: 'Computer Studies Grade 10 SBA Practical',
    subject_key: 'Computer Studies',
    level_key: 'Grade 10',
    assessment_year: 2026,
    summary: 'Official practical project',
    catalogue_scope: 'PLATFORM_OFFICIAL',
    version: 1,
    maximum_marks: '100.00',
    task_count: 3,
    tasks: [],
    eligible_cohort_subjects: [{
      id: 8,
      cohort: { id: 2, name: 'Grade 10' },
      subject: { id: 3, name: 'Computer Studies' },
      academic_year: 5,
      can_deploy: true,
      eligible_instructors: [],
      requires_instructor_selection: false,
    }],
    available_actions: actions,
    deployment_state: {
      state: actions.includes('VIEW_DEPLOYMENT') ? 'DEPLOYED' : 'NOT_DEPLOYED',
      deployments: actions.includes('VIEW_DEPLOYMENT')
        ? [{ id: 73, cohort_subject: 8, status: 'PUBLISHED' }]
        : [],
    },
  } as unknown as ProjectDefinitionVersion;
}

function renderCard(actions: ProjectDefinitionVersion['available_actions']) {
  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(
      <ProjectCatalogueCard
        definition={definition(actions)}
        returnTo="/projects?status=PUBLISHED"
        onViewDetails={vi.fn()}
        onRegister={vi.fn()}
        onDeploy={vi.fn()}
      />,
    );
  });
  return renderer!;
}

describe('ProjectCatalogueCard', () => {
  it('renders REGISTER only as an explicit accessible button', () => {
    const renderer = renderCard(['REGISTER']);
    const buttons = renderer.root.findAllByType('button');
    expect(buttons.some((button) => button.props['aria-label']?.startsWith('Register project'))).toBe(true);
    expect(renderer.root.findAll((node) => node.type === 'div' && typeof node.props.onClick === 'function')).toHaveLength(0);
  });

  it('does not render registration when no server action exists', () => {
    const output = JSON.stringify(renderCard([]).toJSON());
    expect(output).not.toContain('Register project');
  });

  it('links VIEW_DEPLOYMENT to the deployment identifier and preserves returnTo', () => {
    const renderer = renderCard(['VIEW_DEPLOYMENT']);
    const link = renderer.root.findByType('a');
    expect(link.props.href).toBe('/projects/73?returnTo=%2Fprojects%3Fstatus%3DPUBLISHED');
    expect(JSON.stringify(renderer.toJSON())).toContain('View deployed project');
  });

  it('uses correct eligible-target grammar', () => {
    expect(eligibleTargetLabel(1)).toBe('1 eligible teaching target');
    expect(eligibleTargetLabel(2)).toBe('2 eligible teaching targets');
  });
});
