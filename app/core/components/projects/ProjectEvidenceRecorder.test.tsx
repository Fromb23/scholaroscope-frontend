import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectDeployment, ProjectGroup, ProjectParticipant, ProjectTask } from '@/app/core/types/projects';
import { ProjectEvidenceRecorder } from './ProjectEvidenceRecorder';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const task = { id: 7, code: 'T1', title: 'Build system' } as ProjectTask;
const project = { id: 4 } as ProjectDeployment;
const participants = [
  { id: 11, learner_name: 'Hillary Odoyo', status: 'ACTIVE' },
  { id: 12, learner_name: 'Alex Kimani', status: 'ACTIVE' },
] as ProjectParticipant[];

describe('ProjectEvidenceRecorder', () => {
  it('keeps learner drafts while navigating and submits only prepared drafts', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<ProjectEvidenceRecorder project={project} task={task} participants={participants} groups={[] as ProjectGroup[]} pending={false} onCancel={vi.fn()} onScopeChange={vi.fn()} onSubmit={onSubmit} />);
    });
    const button = (label: string) => renderer!.root.findAllByType('button').find((node) => node.children.join('') === label)!;
    act(() => button('Individual learners').props.onClick());
    act(() => renderer!.root.findByType('textarea').props.onChange({ target: { value: 'First learner evidence' } }));
    act(() => button('Next learner').props.onClick());
    act(() => renderer!.root.findByType('textarea').props.onChange({ target: { value: 'Second learner evidence' } }));
    act(() => button('Previous learner').props.onClick());
    expect(renderer!.root.findByType('textarea').props.value).toBe('First learner evidence');
    await act(async () => renderer!.root.findByType('form').props.onSubmit({ preventDefault: vi.fn() }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      task: 7,
      items: [
        expect.objectContaining({ participant: 11 }),
        expect.objectContaining({ participant: 12 }),
      ],
    }));
  });

  it('uses deployment-scoped group links and never renders participant controls in group mode', () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<ProjectEvidenceRecorder project={project} task={task} participants={participants} groups={[{ id: 22, name: 'Group One' } as ProjectGroup]} pending={false} onCancel={vi.fn()} onScopeChange={vi.fn()} onSubmit={vi.fn()} />);
    });
    const groupButton = renderer!.root.findAllByType('button').find((node) => node.children.join('') === 'Group')!;
    act(() => groupButton.props.onClick());
    expect(renderer!.root.findByType('a').props.href).toBe('/projects/4/groups/22');
    expect(JSON.stringify(renderer!.toJSON())).not.toContain('Participant');
  });
});
