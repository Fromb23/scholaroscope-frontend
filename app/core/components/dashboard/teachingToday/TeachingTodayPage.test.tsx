import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TeachingTodayContext } from '@/app/core/hooks/useTeachingToday';
import { TeachingTodayPage } from './TeachingTodayPage';

const mocks = vi.hoisted(() => ({
  teachingToday: {
    context: null as TeachingTodayContext | null,
    loading: false,
    error: null as string | null,
    lastRefresh: new Date('2026-08-03T08:00:00Z'),
    refresh: vi.fn(),
  },
  instructorAccess: {
    isTeachingActor: true,
    isSelfManagedTeachingAdmin: false,
    isLoading: false,
  },
  router: {
    push: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 11, first_name: 'Teacher', is_superadmin: false },
    activeRole: 'INSTRUCTOR',
  }),
}));

vi.mock('@/app/core/hooks/useInstructorCohortAccess', () => ({
  useInstructorCohortAccess: () => mocks.instructorAccess,
}));

vi.mock('@/app/core/hooks/useAcademic', () => ({
  useAcademicLifecycleContext: () => ({ data: null }),
}));

vi.mock('@/app/core/hooks/useTeachingToday', () => ({
  useTeachingToday: () => ({
    context: mocks.teachingToday.context,
    loading: mocks.teachingToday.loading,
    error: mocks.teachingToday.error,
    lastRefresh: mocks.teachingToday.lastRefresh,
    refresh: mocks.teachingToday.refresh,
  }),
}));

vi.mock('@/app/core/components/assistant/useAssistantPageContext', () => ({
  useAssistantPageContext: vi.fn(),
}));

function context(overrides: Partial<TeachingTodayContext> = {}): TeachingTodayContext {
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

function renderPage() {
  return renderToStaticMarkup(<TeachingTodayPage />);
}

describe('TeachingTodayPage request state rendering', () => {
  beforeEach(() => {
    mocks.teachingToday.context = context();
    mocks.teachingToday.loading = false;
    mocks.teachingToday.error = null;
    mocks.teachingToday.refresh.mockReset();
    mocks.instructorAccess.isTeachingActor = true;
    mocks.instructorAccess.isSelfManagedTeachingAdmin = false;
    mocks.instructorAccess.isLoading = false;
  });

  it('renders loading without error or successful-empty messaging', () => {
    mocks.teachingToday.loading = true;

    const html = renderPage();

    expect(html).toContain('Opening Teaching Today');
    expect(html).not.toContain('Some Teaching Today information could not be refreshed.');
    expect(html).not.toContain('No teaching work needs attention today.');
  });

  it('keeps request errors separate from successful empty states', () => {
    mocks.teachingToday.error = 'Network unavailable';

    const html = renderPage();

    expect(html).toContain('Some Teaching Today information could not be refreshed.');
    expect(html).toContain('Network unavailable');
    expect(html).toContain('Retry');
    expect(html).not.toContain('No teaching work needs attention today.');
  });

  it('renders quiet success only for successful empty Teaching Today data', () => {
    const html = renderPage();

    expect(html).toContain('No teaching work needs attention today.');
    expect(html).not.toContain('Some Teaching Today information could not be refreshed.');
  });
});
