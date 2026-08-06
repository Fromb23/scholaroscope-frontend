import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session } from '@/app/core/types/session';
import { SessionsOverview } from './SessionsOverview';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const idleApi = {
  requestIdleCallback: (callback: IdleRequestCallback) => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50,
    });
    return 1;
  },
  cancelIdleCallback: vi.fn(),
};

const groupingSpies = vi.hoisted(() => ({
  classGroups: vi.fn(),
  instructorGroups: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  search: '',
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  auth: {
    user: {
      id: 11,
      email: 'admin@example.com',
      first_name: 'Ada',
      last_name: 'Admin',
      full_name: 'Ada Admin',
      is_superadmin: false,
      is_active: true,
      phone: '',
      date_joined: '2026-01-01T00:00:00Z',
      last_login: '2026-01-01T00:00:00Z',
    },
    activeRole: 'ADMIN' as 'ADMIN' | 'INSTRUCTOR',
    activeOperatingContext: 'WORKSPACE_MANAGEMENT',
    activeOrg: {
      id: 2,
      name: 'Institution',
      slug: 'institution',
      org_type: 'INSTITUTION',
    },
    capabilities: {
      can_teach: false,
      can_manage_academic_setup: true,
      can_manage_learners: true,
      can_manage_cohorts: true,
      can_manage_subjects: true,
      can_manage_assessments: true,
      can_view_reports: true,
      can_manage_staff: true,
      is_workspace_owner: false,
      workspace_mode: 'SCHOOL',
      workspace_behavior: null,
      authorization: {
        permission_keys: ['lessons.review'],
      },
    },
  },
  sessions: [] as Session[],
  todaySessions: [] as Session[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock('next/link', async () => {
  const React = await import('react');
  return {
    default: ({
      href,
      children,
      className,
    }: {
      href: string;
      children: React.ReactNode;
      className?: string;
    }) => React.createElement('a', { href, className }, children),
  };
});

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('@/app/core/hooks/useAcademicTodayMode', () => ({
  useAcademicTodayMode: () => ({ data: null }),
}));

vi.mock('@/app/core/hooks/useAcademic', () => ({
  useCurricula: () => ({ curricula: [] }),
  useTerms: () => ({
    terms: [
      {
        id: 3,
        academic_year: 1,
        academic_year_name: '2026',
        name: 'Term 1',
        sequence: 1,
        start_date: '2026-01-05',
        end_date: '2026-04-03',
        status: 'OPEN',
        is_frozen: false,
      },
    ],
    loading: false,
  }),
}));

vi.mock('@/app/core/hooks/useInstructors', () => ({
  useInstructors: () => ({ instructors: [] }),
}));

vi.mock('@/app/core/hooks/useSessions', () => ({
  useSessions: () => ({
    sessions: mocks.sessions,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useTodaySessions: () => ({
    sessions: mocks.todaySessions,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/app/core/hooks/useCohorts', () => ({
  useCohorts: () => ({ cohorts: [] }),
}));

vi.mock('@/app/core/components/assistant/useAssistantPageContext', () => ({
  useAssistantPageContext: vi.fn(),
}));

vi.mock('@/app/core/lib/sessionOverviewGroups', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/core/lib/sessionOverviewGroups')>();
  return {
    ...actual,
    buildSessionClassGroups: (...args: Parameters<typeof actual.buildSessionClassGroups>) => {
      groupingSpies.classGroups(...args);
      return actual.buildSessionClassGroups(...args);
    },
    buildSessionInstructorGroups: (...args: Parameters<typeof actual.buildSessionInstructorGroups>) => {
      groupingSpies.instructorGroups(...args);
      return actual.buildSessionInstructorGroups(...args);
    },
  };
});

function session(overrides: Partial<Session>): Session {
  return {
    id: 1,
    subject_source: 'kernel',
    session_subject_id: null,
    cambridge_cohort_subject_id: null,
    offering_id: null,
    cohort_subject: 11,
    cohort_id: 7,
    cohort_name: 'Yellow',
    cohort_level: 'Grade 10',
    subject_id: 101,
    subject_name: 'Computer Studies',
    subject_code: 'CMP',
    curriculum_type: 'CBC',
    curriculum_name: 'CBC',
    is_current_year: true,
    academic_year_id: 2026,
    term: 3,
    term_name: 'Term 1',
    session_type: 'LESSON',
    session_type_display: 'Lesson',
    session_date: '2026-02-04',
    start_time: '08:00',
    end_time: '08:40',
    title: 'Lesson',
    status: 'SCHEDULED',
    description: '',
    venue: '',
    created_by: 'teacher@example.com',
    created_by_id: 12,
    created_by_name: 'Teacher One',
    created_by_email: 'teacher@example.com',
    lesson_plan_id: null,
    lesson_plan_title: null,
    lesson_plan_status: null,
    planned_outcomes: [],
    taught_outcomes: [],
    is_unplanned: false,
    schedule_state: 'SCHEDULED_READY',
    is_overdue: false,
    scheduled_start_at: null,
    scheduled_end_at: null,
    can_start_now: false,
    can_reschedule: true,
    needs_completion: false,
    start_available_at: null,
    attendance_count: {
      total: 10,
      present: 8,
      absent: 1,
      late: 1,
      excused: 0,
      sick: 0,
      unmarked: 0,
    },
    created_at: '2026-02-04T08:00:00Z',
    linked_cohorts: [],
    ...overrides,
  };
}

function setSessions(items: Session[]) {
  mocks.sessions = items;
  mocks.todaySessions = [];
}

function textContent(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(textContent).join('');
  }
  if (value && typeof value === 'object' && 'props' in value) {
    return textContent((value as { props: { children?: unknown } }).props.children);
  }
  return '';
}

describe('SessionsOverview grouping composition', () => {
  let renderer: ReactTestRenderer | null = null;

  beforeAll(() => {
    vi.stubGlobal('self', idleApi);
    vi.stubGlobal('requestIdleCallback', idleApi.requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', idleApi.cancelIdleCallback);
  });

  beforeEach(() => {
    mocks.search = '';
    mocks.router.push.mockReset();
    mocks.router.replace.mockReset();
    groupingSpies.classGroups.mockClear();
    groupingSpies.instructorGroups.mockClear();
    setSessions([
      session({ id: 1, cohort_subject: 11, subject_name: 'Computer Studies' }),
      session({ id: 2, cohort_subject: 12, subject_name: 'Mathematics' }),
      session({
        id: 3,
        subject_source: 'cambridge',
        cohort_subject: null,
        cambridge_cohort_subject_id: 41,
        subject_name: 'Physics',
        subject_code: 'PHY',
      }),
    ]);
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => {
        renderer?.unmount();
      });
      renderer = null;
    }
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('renders class groups from the authoritative builder by default', () => {
    const html = renderToStaticMarkup(createElement(SessionsOverview));

    expect(groupingSpies.classGroups).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
        expect.objectContaining({ id: 3 }),
      ]),
      expect.any(Function),
    );
    expect(groupingSpies.instructorGroups).not.toHaveBeenCalled();
    expect(html).toContain('Yellow Grade 10 · Computer Studies');
    expect(html).toContain('Yellow Grade 10 · Mathematics');
    expect(html).toContain('Yellow Grade 10 · Physics');
    expect(html).toContain('1 session');
  });

  it('uses the authoritative instructor builder after switching grouping mode', async () => {
    await act(async () => {
      renderer = create(createElement(SessionsOverview));
    });

    const instructorButton = renderer!.root
      .findAllByType('button')
      .find((button) => textContent(button.props.children).includes('Instructor view'));

    expect(instructorButton).toBeDefined();

    await act(async () => {
      instructorButton!.props.onClick();
    });

    expect(groupingSpies.instructorGroups).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
        expect.objectContaining({ id: 3 }),
      ]),
      expect.any(Function),
      expect.any(Function),
    );
  });
});
