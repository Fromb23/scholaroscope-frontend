import { describe, expect, it } from 'vitest';

import { resolveLessonPlanLifecycleActions } from './lessonPlanLifecycleActions';

describe('resolveLessonPlanLifecycleActions', () => {
  it('makes review the only primary lifecycle action for generated plans', () => {
    const actions = resolveLessonPlanLifecycleActions({
      status: 'GENERATED',
      canCreateTeachingRecords: true,
    });

    expect(actions.primaryAction).toBe('review');
    expect(actions.canReview).toBe(true);
    expect(actions.canEdit).toBe(false);
    expect(actions.canSchedule).toBe(false);
  });

  it('allows optional edit and primary scheduling after review', () => {
    const actions = resolveLessonPlanLifecycleActions({
      status: 'REVIEWED',
      canCreateTeachingRecords: true,
    });

    expect(actions.primaryAction).toBe('schedule');
    expect(actions.canReview).toBe(false);
    expect(actions.canEdit).toBe(true);
    expect(actions.canSchedule).toBe(true);
  });

  it('opens the scheduled lesson as the primary scheduled action', () => {
    const actions = resolveLessonPlanLifecycleActions({
      status: 'SCHEDULED',
      canCreateTeachingRecords: true,
      hasScheduledSession: true,
    });

    expect(actions.primaryAction).toBe('openScheduledLesson');
    expect(actions.canReview).toBe(false);
    expect(actions.canOpenScheduledLesson).toBe(true);
  });

  it('locks used and archived plans for normal standalone editing', () => {
    expect(resolveLessonPlanLifecycleActions({
      status: 'USED',
      canCreateTeachingRecords: true,
    }).canEdit).toBe(false);
    expect(resolveLessonPlanLifecycleActions({
      status: 'ARCHIVED',
      canCreateTeachingRecords: true,
    }).canEdit).toBe(false);
  });
});
