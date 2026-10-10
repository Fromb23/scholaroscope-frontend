import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectDeployment, ProjectWorkspaceSummary } from '@/app/core/types/projects';
import { ProjectStreamSelectionPage } from './ProjectStreamSelectionPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock('next/navigation', () => ({
  useParams: () => ({ definitionVersionId: '41' }),
  useSearchParams: () => new URLSearchParams('returnTo=%2Fprojects'),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));
vi.mock('./ProjectScheduleStatus', () => ({
  ProjectScheduleStatus: () => React.createElement('span', null, 'Schedule'),
}));

const deployment = (id: number, name: string, learners: number) =>
  ({
    id,
    cohort: { id: id + 100, name, level: 'grade_10' },
    subject: { id: 8, name: 'Computer Studies', code: 'COMP' },
    participant_count: learners,
    administering_instructor_name: 'Assigned Teacher',
    status: 'PUBLISHED',
    progress: {
      task_count: 3,
      completed_task_count: 1,
      expected_participant_task_count: learners * 3,
      evidence_coverage: { covered: 2, expected: learners * 3, percentage: 5 },
      evaluation_coverage: { covered: 1, expected: learners * 3, percentage: 2 },
      evidence_count: 2,
      evaluation_count: 1,
    },
    readiness: { state: 'READY', incomplete_required_checklist_items: [] },
    schedule: {
      status: 'NORMAL',
      urgency: 'NORMAL',
      timezone: 'Africa/Nairobi',
      starts_at: '2026-02-01T08:00:00Z',
      deadline_at: '2026-10-01T17:00:00Z',
      total_duration_seconds: 1,
      elapsed_duration_seconds: 0,
      elapsed_percentage: 0,
      remaining_seconds: 1,
      remaining_calendar_days: 1,
    },
  }) as unknown as ProjectDeployment;

const workspace: ProjectWorkspaceSummary = {
  definition_version: 41,
  title: 'Computer Studies SBA Practical',
  subject: { id: 8, name: 'Computer Studies', code: 'COMP' },
  level_key: 'grade_10',
  pathway_key: 'STEM',
  assessment_year: 2026,
  adoption: null,
  stream_count: 4,
  total_learner_count: 69,
  lifecycle_summary: { status_counts: { PUBLISHED: 4 }, is_uniform: true },
  progress: {
    completed_stream_task_count: 4,
    expected_stream_task_count: 12,
    percentage: 33.3,
  },
  authority: { can_reconcile_streams: true, can_reopen_late_evidence: true },
  deployments: [
    deployment(11, 'Stream A', 15),
    deployment(12, 'Stream B', 18),
    deployment(13, 'Stream C', 16),
    deployment(14, 'Stream D', 20),
  ],
};

let missingRows: Array<Record<string, unknown>> = [];
const addMissingStreams = vi.fn().mockResolvedValue(undefined);

vi.mock('@/app/core/hooks/useProjects', () => ({
  useProjectWorkspace: () => ({ data: workspace, isLoading: false, error: null, refetch: vi.fn() }),
  useMissingProjectStreams: () => ({
    data: missingRows,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useProjectWorkspaceMutations: () => ({
    addMissingStreams: { isPending: false, error: null, mutateAsync: addMissingStreams },
    reopenLateEvidence: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

describe('ProjectStreamSelectionPage', () => {
  beforeEach(() => {
    missingRows = [];
    addMissingStreams.mockClear();
  });

  it('renders each authorized deployment as an independent stream workspace link', () => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<ProjectStreamSelectionPage />);
    });
    const links = renderer!.root.findAllByType('a').map((node) => node.props.href as string);
    expect(links.filter((href) => href.startsWith('/projects/1'))).toEqual([
      '/projects/11?returnTo=%2Fprojects%2Fdefinitions%2F41',
      '/projects/12?returnTo=%2Fprojects%2Fdefinitions%2F41',
      '/projects/13?returnTo=%2Fprojects%2Fdefinitions%2F41',
      '/projects/14?returnTo=%2Fprojects%2Fdefinitions%2F41',
    ]);
    const output = JSON.stringify(renderer!.toJSON());
    expect(output).toContain('learners across streams');
    expect(output).toContain('"69"');
    expect(output).toContain('All eligible streams are set up');
  });

  it('lets an authorized administrator select and reconcile three missing streams', async () => {
    missingRows = ['Stream B', 'Stream C', 'Stream D'].map((streamName, index) => ({
      cohort_subject: 201 + index,
      stream_name: streamName,
      subject_name: 'Computer Studies',
      eligible_instructors: [
        { id: 31, name: 'Assigned Teacher', email: 'teacher@example.test', eligible: true },
      ],
      auto_selected_instructor: {
        id: 31,
        name: 'Assigned Teacher',
        email: 'teacher@example.test',
        eligible: true,
      },
      requires_instructor_selection: false,
      ready: true,
      message: 'Ready',
    }));
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<ProjectStreamSelectionPage />);
    });
    const button = (label: string) =>
      renderer!.root.findAllByType('button').find((node) => node.children.join('') === label)!;
    act(() => button('Add missing streams').props.onClick());
    const checkboxes = renderer!.root
      .findAllByType('input')
      .filter((node) => node.props.type === 'checkbox');
    expect(checkboxes).toHaveLength(3);
    for (const checkbox of checkboxes) {
      act(() => checkbox.props.onChange({ target: { checked: true } }));
    }
    await act(async () => button('Add 3 streams').props.onClick());
    expect(addMissingStreams).toHaveBeenCalledWith([
      { cohort_subject: 201, administering_instructor: 31 },
      { cohort_subject: 202, administering_instructor: 31 },
      { cohort_subject: 203, administering_instructor: 31 },
    ]);
  });
});
