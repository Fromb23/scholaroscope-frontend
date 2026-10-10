import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectGroup, ProjectParticipant, ProjectTask } from '@/app/core/types/projects';
import { ProjectTaskEvaluationEditor } from './ProjectTaskEvaluationEditor';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ProjectTaskEvaluationEditor', () => {
  it('fixes the task and preserves learner drafts while navigating', async () => {
    const task = {
      id: 7,
      code: 'T1',
      title: 'Build system',
      instructions: 'Build it.',
      criteria: [
        { id: 2, code: 'C1', description: 'Works', maximum_marks: '5', curriculum_mappings: [] },
      ],
    } as unknown as ProjectTask;
    const participants = [
      { id: 11, learner_name: 'Ada', status: 'ACTIVE' },
      { id: 12, learner_name: 'Linus', status: 'ACTIVE' },
    ] as ProjectParticipant[];
    const submit = vi.fn().mockResolvedValue(undefined);
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        <ProjectTaskEvaluationEditor
          deploymentId={3}
          task={task}
          participants={participants}
          groups={[]}
          pending={false}
          onCancel={vi.fn()}
          onSubmit={submit}
        />,
      );
    });
    expect(renderer!.root.findAllByType('select')).toHaveLength(0);
    const textarea = () => renderer!.root.findByType('textarea');
    const score = () => renderer!.root.findByType('input');
    act(() => textarea().props.onChange({ target: { value: 'Ada draft' } }));
    act(() => score().props.onChange({ target: { value: '4' } }));
    const next = renderer!.root
      .findAllByType('button')
      .find((node) => node.children.join('') === 'Next learner')!;
    act(() => next.props.onClick());
    act(() => textarea().props.onChange({ target: { value: 'Linus draft' } }));
    act(() => score().props.onChange({ target: { value: '5' } }));
    const previous = renderer!.root
      .findAllByType('button')
      .find((node) => node.children.join('') === 'Previous learner')!;
    act(() => previous.props.onClick());
    expect(textarea().props.value).toBe('Ada draft');
    await act(async () =>
      renderer!.root.findByType('form').props.onSubmit({ preventDefault: vi.fn() }),
    );
    expect(submit).toHaveBeenCalledWith([
      expect.objectContaining({
        task: 7,
        participant: 11,
        teacher_feedback: 'Ada draft',
        criterion_scores: [{ criterion: 2, awarded_marks: '4' }],
      }),
      expect.objectContaining({
        task: 7,
        participant: 12,
        teacher_feedback: 'Linus draft',
        criterion_scores: [{ criterion: 2, awarded_marks: '5' }],
      }),
    ]);
  });

  it('creates one learner evaluation for every active member of the selected group', async () => {
    const task = {
      id: 7,
      code: 'T1',
      title: 'Build system',
      instructions: 'Build it.',
      criteria: [
        {
          id: 2,
          code: 'C1',
          description: 'Works',
          maximum_marks: '5',
          curriculum_mappings: [],
        },
      ],
    } as unknown as ProjectTask;
    const participants = [
      { id: 11, learner_name: 'Ada', status: 'ACTIVE' },
      { id: 12, learner_name: 'Linus', status: 'ACTIVE' },
      { id: 13, learner_name: 'Grace', status: 'WITHDRAWN' },
    ] as ProjectParticipant[];
    const groups = [
      {
        id: 21,
        name: 'Builders',
        members: [
          { participant: 11, participation_status: 'ACTIVE' },
          { participant: 12, participation_status: 'ACTIVE' },
          { participant: 13, participation_status: 'WITHDRAWN' },
        ],
      },
    ] as ProjectGroup[];
    const submit = vi.fn().mockResolvedValue(undefined);
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        <ProjectTaskEvaluationEditor
          deploymentId={3}
          task={task}
          participants={participants}
          groups={groups}
          pending={false}
          onCancel={vi.fn()}
          onSubmit={submit}
        />,
      );
    });
    const groupsButton = renderer!.root
      .findAllByType('button')
      .find((node) => node.children.join('') === 'Groups')!;
    act(() => groupsButton.props.onClick());
    act(() =>
      renderer!.root.findByType('textarea').props.onChange({ target: { value: 'Shared' } }),
    );
    act(() => renderer!.root.findByType('input').props.onChange({ target: { value: '4' } }));
    await act(async () =>
      renderer!.root.findByType('form').props.onSubmit({ preventDefault: vi.fn() }),
    );
    expect(submit).toHaveBeenCalledWith([
      expect.objectContaining({ task: 7, participant: 11, teacher_feedback: 'Shared' }),
      expect.objectContaining({ task: 7, participant: 12, teacher_feedback: 'Shared' }),
    ]);
    expect(JSON.stringify(renderer!.toJSON())).toContain('/projects/3/groups/21');
  });
});
