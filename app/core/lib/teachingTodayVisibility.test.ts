import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getTeachingTodaySectionVisibility } from '@/app/core/lib/teachingTodayVisibility';
import type { TeachingTodayContext } from '@/app/core/hooks/useTeachingToday';

function context(overrides: Partial<TeachingTodayContext>): TeachingTodayContext {
  return {
    todayKey: '2026-08-03',
    academicContexts: [],
    currentTerm: null,
    currentWeek: null,
    setupStatus: null,
    calendarEventsToday: [],
    calendarAffectsLearning: false,
    todayMode: null,
    actionEligibility: {
      createNewWorkAllowed: true,
      createNewWorkReason: null,
      initiatePreparedWorkAllowed: true,
      initiatePreparedWorkReason: null,
      reconcileExistingWorkAllowed: true,
      reconcileExistingWorkReason: null,
      readHistoricalWorkAllowed: true,
    },
    normalTeachingExpected: true,
    learningDayState: 'NORMAL_TEACHING_DAY',
    sessions: {
      overdueOpen: [],
      active: [],
      ready: [],
      overdueScheduled: [],
      upcoming: [],
      completed: [],
      locked: [],
    },
    timeline: [],
    incomplete: [],
    assignmentWork: [],
    nextAction: null,
    afterTeaching: {
      pendingAssessmentReviewCount: 0,
      pendingAssessments: [],
      assignmentWork: [],
    },
    teachingLoad: [],
    ...overrides,
  };
}

describe('Teaching Today section visibility', () => {
  it('renders one page-level lifecycle notice and suppresses empty operational sections for ended terms', () => {
    const visibility = getTeachingTodaySectionVisibility(context({
      learningDayState: 'CLOSING_PERIOD',
      normalTeachingExpected: false,
      actionEligibility: {
        createNewWorkAllowed: false,
        createNewWorkReason: 'Term ended',
        initiatePreparedWorkAllowed: false,
        initiatePreparedWorkReason: 'Term ended',
        reconcileExistingWorkAllowed: true,
        reconcileExistingWorkReason: null,
        readHistoricalWorkAllowed: true,
      },
    }));

    expect(visibility.hasPageLifecycleNotice).toBe(true);
    expect(visibility.showNowPanel).toBe(false);
    expect(visibility.showTimeline).toBe(false);
    expect(visibility.showIncompletePanel).toBe(false);
    expect(visibility.showAfterTeachingPanel).toBe(false);
    expect(visibility.showQuietEmptyState).toBe(false);
  });

  it('keeps real unfinished records visible during lifecycle boundaries', () => {
    const visibility = getTeachingTodaySectionVisibility(context({
      learningDayState: 'CLOSING_PERIOD',
      normalTeachingExpected: false,
      incomplete: [{
        id: 'unfinished-1',
        group: 'NEEDS_COMPLETION',
        session: { id: 10 } as never,
        title: 'Needs completion',
        detail: 'A historical record needs completion.',
        missing: ['attendance missing'],
        actionLabel: 'Complete record',
        actionHref: '/sessions/10?section=complete',
        severity: 'warning',
      }],
      actionEligibility: {
        createNewWorkAllowed: false,
        createNewWorkReason: 'Term ended',
        initiatePreparedWorkAllowed: false,
        initiatePreparedWorkReason: 'Term ended',
        reconcileExistingWorkAllowed: true,
        reconcileExistingWorkReason: null,
        readHistoricalWorkAllowed: true,
      },
    }));

    expect(visibility.hasPageLifecycleNotice).toBe(true);
    expect(visibility.showIncompletePanel).toBe(true);
    expect(visibility.hasOperationalRecords).toBe(true);
  });

  it('does not treat loading or request failures as successful empty data', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'app/core/components/dashboard/teachingToday/TeachingTodayPage.tsx'),
      'utf8',
    );

    expect(pageSource).toContain('if (pageLoading) return <LoadingSpinner');
    expect(pageSource).toContain('Some Teaching Today information could not be refreshed.');
    expect(pageSource).toContain('sectionVisibility.showTimeline');
  });

  it('renders the timeline and open-session action only when sessions exist', () => {
    const visibility = getTeachingTodaySectionVisibility(context({
      timeline: [{ id: 1 } as never],
      nextAction: {
        key: 'open-today-sessions',
        title: "Follow today's timeline",
        description: 'Use the timeline.',
        primaryLabel: "Open today's sessions",
        primaryHref: '/sessions/today',
        tone: 'success',
      },
    }));

    expect(visibility.showTimeline).toBe(true);
    expect(visibility.showNowPanel).toBe(true);
    expect(visibility.hasTodaySessions).toBe(true);
  });
});
