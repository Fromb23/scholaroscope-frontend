import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectDeployment, ProjectTask } from '@/app/core/types/projects';
import { ProjectTaskWorkspace } from './ProjectTaskWorkspace';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('ProjectTaskWorkspace', () => {
  it('shows an enabled start action for a startable assigned-teacher task', () => {
    const task = {
      id: 6,
      code: 'T0',
      title: 'Prepare',
      instructions: '',
      maximum_marks: '5',
      steps: [],
      criteria: [],
      curriculum_mappings: [],
    } as unknown as ProjectTask;
    const project = {
      definition: { tasks: [task] },
      task_executions: [
        {
          task: 6,
          status: 'AVAILABLE',
          authority: {
            can_activate: true,
            can_record_evidence: false,
            can_evaluate: false,
            blocked_reason_codes: { record_evidence: 'TASK_NOT_ACTIVE' },
          },
          blocked_reason_codes: { record_evidence: 'TASK_NOT_ACTIVE' },
          evidence_coverage: { covered: 0, expected: 1, percentage: 0 },
          evaluation_coverage: { covered: 0, expected: 1, percentage: 0 },
        },
      ],
    } as unknown as ProjectDeployment;
    const start = vi.fn();
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        <ProjectTaskWorkspace
          project={project}
          task={task}
          taskIndex={0}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
          onStartTask={start}
          onRecordEvidence={vi.fn()}
          onEvaluate={vi.fn()}
        />,
      );
    });
    const startButton = renderer!.root
      .findAllByType('button')
      .find((node) => node.children.join('') === 'Start task')!;
    expect(startButton.props.disabled).toBe(false);
    act(() => startButton.props.onClick());
    expect(start).toHaveBeenCalledOnce();
  });

  it('renders one task, outcome descriptions and server-authorized evidence action', () => {
    const task = {
      id: 7,
      code: 'T1',
      title: 'Build system',
      instructions: 'Connect the components.',
      maximum_marks: '20',
      steps: [],
      criteria: [],
      curriculum_mappings: [
        {
          reference_id: 'internal-id',
          reference_snapshot: {
            code: 'COMP.1',
            description: 'Connect computer hardware components correctly.',
          },
        },
      ],
    } as unknown as ProjectTask;
    const project = {
      authority: { can_record_evidence: true },
      definition: { tasks: [task, { id: 8, title: 'Hidden task' }] },
      task_executions: [
        {
          task: 7,
          status: 'ACTIVE',
          authority: {
            can_activate: false,
            can_record_evidence: true,
            can_evaluate: true,
            blocked_reason_codes: {},
          },
          blocked_reason_codes: {},
          can_record_evidence: true,
          evidence_coverage: { covered: 2, expected: 4, percentage: 50 },
          evaluation_coverage: { covered: 1, expected: 4, percentage: 25 },
        },
      ],
    } as unknown as ProjectDeployment;
    const record = vi.fn();
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        <ProjectTaskWorkspace
          project={project}
          task={task}
          taskIndex={0}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
          onStartTask={vi.fn()}
          onRecordEvidence={record}
          onEvaluate={vi.fn()}
        />,
      );
    });
    const output = JSON.stringify(renderer!.toJSON());
    expect(
      renderer!.root.findAllByType('span').some((node) => node.children.join('') === 'Task 1 of 2'),
    ).toBe(true);
    expect(output).toContain('Connect computer hardware components correctly.');
    expect(output).not.toContain('Hidden task');
    const recordButton = renderer!.root
      .findAllByType('button')
      .find((node) => node.children.join('') === 'Record evidence')!;
    act(() => recordButton.props.onClick());
    expect(record).toHaveBeenCalledOnce();
  });

  it('keeps a dependency-blocked teacher start action visible and disabled', () => {
    const task = {
      id: 9,
      code: 'T2',
      title: 'Dependent work',
      instructions: '',
      maximum_marks: '10',
      steps: [],
      criteria: [],
      curriculum_mappings: [],
    } as unknown as ProjectTask;
    const project = {
      definition: { tasks: [task] },
      task_executions: [
        {
          task: 9,
          status: 'PENDING',
          authority: {
            can_activate: false,
            can_record_evidence: false,
            can_evaluate: false,
            blocked_reason_codes: { activate: 'TASK_DEPENDENCY_INCOMPLETE' },
          },
          blocked_reason_codes: { activate: 'TASK_DEPENDENCY_INCOMPLETE' },
          evidence_coverage: { covered: 0, expected: 1, percentage: 0 },
          evaluation_coverage: { covered: 0, expected: 1, percentage: 0 },
        },
      ],
    } as unknown as ProjectDeployment;
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        <ProjectTaskWorkspace
          project={project}
          task={task}
          taskIndex={0}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
          onStartTask={vi.fn()}
          onRecordEvidence={vi.fn()}
          onEvaluate={vi.fn()}
        />,
      );
    });
    const start = renderer!.root
      .findAllByType('button')
      .find((node) => node.children.join('') === 'Start task')!;
    expect(start.props.disabled).toBe(true);
    expect(JSON.stringify(renderer!.toJSON())).toContain('prerequisite task');
  });

  it('hides teaching actions when the backend denies structural authority', () => {
    const task = {
      id: 10,
      code: 'T3',
      title: 'Admin view',
      instructions: '',
      maximum_marks: '10',
      steps: [],
      criteria: [],
      curriculum_mappings: [],
    } as unknown as ProjectTask;
    const project = {
      definition: { tasks: [task] },
      task_executions: [
        {
          task: 10,
          status: 'ACTIVE',
          authority: {
            can_activate: false,
            can_record_evidence: false,
            can_evaluate: false,
            blocked_reason_codes: {
              record_evidence: 'PERMISSION_DENIED',
              evaluate: 'PERMISSION_DENIED',
            },
          },
          blocked_reason_codes: {
            record_evidence: 'PERMISSION_DENIED',
            evaluate: 'PERMISSION_DENIED',
          },
          evidence_coverage: { covered: 0, expected: 1, percentage: 0 },
          evaluation_coverage: { covered: 0, expected: 1, percentage: 0 },
        },
      ],
    } as unknown as ProjectDeployment;
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        <ProjectTaskWorkspace
          project={project}
          task={task}
          taskIndex={0}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
          onStartTask={vi.fn()}
          onRecordEvidence={vi.fn()}
          onEvaluate={vi.fn()}
        />,
      );
    });
    const output = JSON.stringify(renderer!.toJSON());
    expect(output).not.toContain('Record evidence');
    expect(output).not.toContain('Evaluate task');
  });

  it('keeps expired evidence visible and disabled with reopening guidance', () => {
    const task = {
      id: 11,
      code: 'T4',
      title: 'Late evidence',
      instructions: '',
      maximum_marks: '10',
      steps: [],
      criteria: [],
      curriculum_mappings: [],
    } as unknown as ProjectTask;
    const project = {
      definition: { tasks: [task] },
      task_executions: [
        {
          task: 11,
          status: 'ACTIVE',
          authority: {
            can_activate: false,
            can_record_evidence: false,
            can_evaluate: true,
            blocked_reason_codes: { record_evidence: 'EVIDENCE_WINDOW_CLOSED' },
          },
          blocked_reason_codes: { record_evidence: 'EVIDENCE_WINDOW_CLOSED' },
          evidence_coverage: { covered: 0, expected: 1, percentage: 0 },
          evaluation_coverage: { covered: 0, expected: 1, percentage: 0 },
        },
      ],
    } as unknown as ProjectDeployment;
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        <ProjectTaskWorkspace
          project={project}
          task={task}
          taskIndex={0}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
          onStartTask={vi.fn()}
          onRecordEvidence={vi.fn()}
          onEvaluate={vi.fn()}
        />,
      );
    });
    const recordButton = renderer!.root
      .findAllByType('button')
      .find((node) => node.children.join('') === 'Record evidence')!;
    expect(recordButton.props.disabled).toBe(true);
    expect(JSON.stringify(renderer!.toJSON())).toContain('reopen late evidence');
  });
});
