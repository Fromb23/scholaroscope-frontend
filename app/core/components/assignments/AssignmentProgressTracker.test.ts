import { describe, expect, it } from 'vitest';
import {
  getAssignmentCurrentProgressStage,
} from './AssignmentProgressTracker';
import type { AssignmentLifecycleState } from '@/app/core/types/assignments';

function buildLifecycleState(overrides: Partial<AssignmentLifecycleState> = {}): AssignmentLifecycleState {
  return {
    stage: 'PREPARING',
    teacher_stage_label: 'Prepared',
    status: 'DRAFT',
    next_action: 'ISSUE_ASSIGNMENT',
    next_action_label: 'Issue learner task',
    next_action_description: 'Issue the prepared learner task.',
    ready_for_next_action: true,
    blocking_items: [],
    warnings: [],
    allowed_actions: ['ISSUE_ASSIGNMENT'],
    summary: {
      recipients_count: 0,
      submissions_count: 0,
      pending_review_count: 0,
      missing_count: 0,
      groups_count: 0,
      group_members_count: 0,
      unresolved_participation_count: 0,
      evidence_pending_count: 0,
    },
    ...overrides,
  };
}

describe('AssignmentProgressTracker stage mapping', () => {
  it('shows Preparing assignments as Prepared', () => {
    expect(getAssignmentCurrentProgressStage(buildLifecycleState({ stage: 'PREPARING' }))).toBe('Prepared');
  });

  it('shows issued assignments without responses as Issued', () => {
    expect(getAssignmentCurrentProgressStage(buildLifecycleState({
      stage: 'ISSUED',
      status: 'PUBLISHED',
      next_action: 'RECORD_SUBMISSION',
    }))).toBe('Issued');
  });

  it('shows issued assignments with responses as Responses', () => {
    expect(getAssignmentCurrentProgressStage(buildLifecycleState({
      stage: 'ISSUED',
      status: 'PUBLISHED',
      next_action: 'REVIEW_WORK',
      summary: {
        recipients_count: 10,
        submissions_count: 3,
        pending_review_count: 3,
        missing_count: 0,
        groups_count: 0,
        group_members_count: 0,
        unresolved_participation_count: 0,
        evidence_pending_count: 0,
      },
    }))).toBe('Responses');
  });

  it('shows reviewing assignments as Review before evidence storage', () => {
    expect(getAssignmentCurrentProgressStage(buildLifecycleState({
      stage: 'REVIEWING',
      status: 'CLOSED',
      next_action: 'REVIEW_WORK',
      summary: {
        recipients_count: 10,
        submissions_count: 10,
        pending_review_count: 2,
        missing_count: 0,
        groups_count: 0,
        group_members_count: 0,
        unresolved_participation_count: 0,
        evidence_pending_count: 0,
      },
    }))).toBe('Review');
  });

  it('shows stored assignments as Stored', () => {
    expect(getAssignmentCurrentProgressStage(buildLifecycleState({
      stage: 'STORED',
      status: 'ARCHIVED',
      next_action: 'NONE',
    }))).toBe('Stored');
  });
});
