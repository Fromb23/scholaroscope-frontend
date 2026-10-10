import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectDeployment, ProjectTask } from '@/app/core/types/projects';
import { ProjectTaskWorkspace } from './ProjectTaskWorkspace';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ProjectTaskWorkspace', () => {
  it('renders one task, outcome descriptions and server-authorized evidence action', () => {
    const task = {
      id: 7,
      code: 'T1',
      title: 'Build system',
      instructions: 'Connect the components.',
      maximum_marks: '20',
      steps: [],
      criteria: [],
      curriculum_mappings: [{ reference_id: 'internal-id', reference_snapshot: { code: 'COMP.1', description: 'Connect computer hardware components correctly.' } }],
    } as unknown as ProjectTask;
    const project = {
      authority: { can_record_evidence: true },
      definition: { tasks: [task, { id: 8, title: 'Hidden task' }] },
      task_executions: [{ task: 7, status: 'ACTIVE', can_record_evidence: true, evidence_coverage: { covered: 2, expected: 4, percentage: 50 }, evaluation_coverage: { covered: 1, expected: 4, percentage: 25 } }],
    } as unknown as ProjectDeployment;
    const record = vi.fn();
    let renderer: ReactTestRenderer;
    act(() => { renderer = create(<ProjectTaskWorkspace project={project} task={task} taskIndex={0} onPrevious={vi.fn()} onNext={vi.fn()} onRecordEvidence={record} />); });
    const output = JSON.stringify(renderer!.toJSON());
    expect(
      renderer!.root.findAllByType('span').some((node) => node.children.join('') === 'Task 1 of 2'),
    ).toBe(true);
    expect(output).toContain('Connect computer hardware components correctly.');
    expect(output).not.toContain('Hidden task');
    const recordButton = renderer!.root.findAllByType('button').find((node) => node.children.join('') === 'Record evidence')!;
    act(() => recordButton.props.onClick());
    expect(record).toHaveBeenCalledOnce();
  });
});
