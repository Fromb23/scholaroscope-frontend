import type { LessonPlanStatus } from '@/app/core/types/lessonPlans';

export type LessonPlanPrimaryAction =
  | 'review'
  | 'schedule'
  | 'openScheduledLesson'
  | null;

export interface LessonPlanLifecycleActionContext {
  status: LessonPlanStatus;
  canCreateTeachingRecords: boolean;
  hasScheduledSession?: boolean;
}

export interface LessonPlanLifecycleActions {
  canReview: boolean;
  canEdit: boolean;
  canSchedule: boolean;
  canPrepareLearnerTask: boolean;
  canOpenScheduledLesson: boolean;
  canArchive: boolean;
  canRestore: boolean;
  primaryAction: LessonPlanPrimaryAction;
}

export function resolveLessonPlanLifecycleActions(
  context: LessonPlanLifecycleActionContext,
): LessonPlanLifecycleActions {
  const hasScheduledSession = Boolean(context.hasScheduledSession);
  const canAct = context.canCreateTeachingRecords;
  const canReview = canAct && context.status === 'GENERATED';
  const canSchedule = canAct && context.status === 'REVIEWED' && !hasScheduledSession;
  const canPrepareLearnerTask = canAct && ['REVIEWED', 'SCHEDULED'].includes(context.status);
  const canOpenScheduledLesson = context.status === 'SCHEDULED' && hasScheduledSession;

  let primaryAction: LessonPlanPrimaryAction = null;
  if (canReview) {
    primaryAction = 'review';
  } else if (canSchedule) {
    primaryAction = 'schedule';
  } else if (canOpenScheduledLesson) {
    primaryAction = 'openScheduledLesson';
  }

  return {
    canReview,
    canEdit: canAct && ['DRAFT', 'REVIEWED', 'SCHEDULED'].includes(context.status),
    canSchedule,
    canPrepareLearnerTask,
    canOpenScheduledLesson,
    canArchive: canAct && context.status !== 'ARCHIVED',
    canRestore: canAct && context.status === 'ARCHIVED',
    primaryAction,
  };
}
