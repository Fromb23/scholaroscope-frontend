import type { TeachingTodayContext, TeachingTodayAction } from '@/app/core/hooks/useTeachingToday';

const lifecycleNoticeStates = new Set<TeachingTodayContext['learningDayState']>([
  'NO_ACTIVE_TERM',
  'EXAM_DAY',
  'HOLIDAY',
  'PUBLIC_HOLIDAY',
  'SCHOOL_EVENT',
  'CLOSING_PERIOD',
]);

function actionTargetsTodaySessions(action: TeachingTodayAction): boolean {
  return action.primaryHref === '/sessions/today';
}

function isOperationalAction(action: TeachingTodayAction | null, hasTodaySessions: boolean): boolean {
  if (!action) {
    return false;
  }

  if (action.key === 'quiet-day' || action.key === 'calendar-clear-day') {
    return false;
  }

  if (actionTargetsTodaySessions(action) && !hasTodaySessions) {
    return false;
  }

  return true;
}

export function getTeachingTodaySectionVisibility(context: TeachingTodayContext) {
  const hasTodaySessions = context.timeline.length > 0;
  const hasIncompleteRecords = context.incomplete.length > 0;
  const hasAfterTeachingWork = (
    context.afterTeaching.pendingAssessments.length > 0
    || context.afterTeaching.assignmentWork.length > 0
  );
  const hasPageLifecycleNotice = (
    !context.actionEligibility.createNewWorkAllowed
    || lifecycleNoticeStates.has(context.learningDayState)
    || context.calendarEventsToday.length > 0
  );
  const hasActionableWork = isOperationalAction(context.nextAction, hasTodaySessions);
  const hasOperationalRecords = (
    hasTodaySessions
    || hasIncompleteRecords
    || hasAfterTeachingWork
    || hasActionableWork
  );

  return {
    hasTodaySessions,
    hasIncompleteRecords,
    hasAfterTeachingWork,
    hasActionableWork,
    hasPageLifecycleNotice,
    hasOperationalRecords,
    showNowPanel: hasActionableWork,
    showTimeline: hasTodaySessions,
    showIncompletePanel: hasIncompleteRecords,
    showAfterTeachingPanel: hasAfterTeachingWork,
    showQuietEmptyState: !hasOperationalRecords && !hasPageLifecycleNotice,
  };
}
