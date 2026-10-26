import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectParticipant } from '@/app/core/types/projects';
import { ProjectCatchUpReview } from './ProjectCatchUpReview';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('@/app/core/hooks/useProjects', () => ({
  useProjectCatchUpReview: () => ({
    review: {
      data: {
        participant: { id: 9 },
        context: {
          scope: 'PROJECT',
          scope_message: 'This review covers this project only, not all missed learning.',
          prior_evidence_message: 'Inaccessible prior-school evidence is not imported.',
          outcomes: [
            {
              id: 1,
              code: 'LO-1',
              description: 'Explain the system.',
              instruction_state: 'TAUGHT_WHILE_ELIGIBLE_EXPOSURE_UNCONFIRMED',
              taught_before_admission: false,
              taught_while_eligible: true,
              confirmed_learner_exposure: false,
              class_session_dates: ['2026-10-01'],
              valid_evidence: [],
            },
          ],
          tasks: [
            {
              execution_id: 4,
              task_id: 3,
              code: 'T1',
              title: 'Investigate',
              status: 'ACTIVE',
              started_at: '2026-10-01T08:00:00Z',
              started_before_admission: true,
              prospectively_admitted: true,
            },
          ],
          catch_up_assignment_options: [],
          diagnostic_assessment_options: [],
        },
      },
      isLoading: false,
      error: null,
    },
    save: { mutate: mocks.mutate, isPending: false, error: null },
  }),
}));

describe('ProjectCatchUpReview', () => {
  it('shows project-scoped coverage separately from learner exposure and records a disposition', () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        <ProjectCatchUpReview
          deploymentId={5}
          participant={
            {
              id: 9,
              learner_name: 'Late Learner',
              is_late_addition: true,
              catch_up_status: 'TEACHER_DECISION_REQUIRED',
            } as ProjectParticipant
          }
          canReview
        />,
      );
    });
    const open = renderer!.root
      .findAllByType('button')
      .find((node) => node.children.join('') === 'Review project catch-up')!;
    act(() => open.props.onClick());
    const output = JSON.stringify(renderer!.toJSON());
    expect(output).toContain('project only');
    expect(output).toContain('Taught while eligible; learner exposure is unconfirmed');
    expect(output).toContain('started before admission');
    expect(output).toContain('Inaccessible prior-school evidence');

    const selects = renderer!.root.findAllByType('select');
    act(() => selects[0].props.onChange({ target: { value: 'NO_ADDITIONAL_WORK' } }));
    const inputs = renderer!.root.findAllByType('input');
    act(() => inputs[0].props.onChange({ target: { value: 'Reviewed current context.' } }));
    act(() => inputs[1].props.onChange({ target: { value: 'Monitor the next task.' } }));
    act(() => renderer!.root.findByType('form').props.onSubmit({ preventDefault: vi.fn() }));
    expect(mocks.mutate).toHaveBeenCalledWith({
      disposition: 'NO_ADDITIONAL_WORK',
      reason: 'Reviewed current context.',
      next_step: 'Monitor the next task.',
      assignment_recipient: undefined,
      assessment: undefined,
      evidence_ids: [],
    });
  });
});
