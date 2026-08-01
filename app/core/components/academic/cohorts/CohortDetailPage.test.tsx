import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: {
    user: { id: 5, email: 'teacher@example.com' },
    activeRole: 'INSTRUCTOR' as 'ADMIN' | 'INSTRUCTOR',
    activeOrg: { id: 1, org_type: 'INSTITUTION' },
    capabilities: [],
    loading: false,
  },
  pluginState: {
    state: 'available',
    message: null,
  } as { state: 'available' | 'unauthorized'; message: string | null },
  instructorAccess: {
    isTeachingActor: true,
    isLoading: false,
    cohortIds: [9],
    cohortSubjectIds: [26],
  },
  useCohortSubjectParticipation: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '9' }),
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('@/app/core/hooks/usePlugins', () => ({
  usePlugins: () => ({
    hasPlugin: (key: string) => key === 'cbc' && mocks.pluginState.state === 'available',
    loading: false,
    getPluginCapabilityState: (key: string) => (
      key === 'cbc'
        ? mocks.pluginState
        : { state: 'not_installed', message: null }
    ),
  }),
}));

vi.mock('@/app/core/hooks/useAcademic', () => ({
  useCohortDetail: () => ({
    cohort: {
      id: 9,
      name: 'Grade 7',
      level: 'Grade 7',
      curriculum: 3,
      curriculum_name: 'CBC',
      curriculum_type: 'CBE',
      academic_year: 2,
      academic_year_name: '2026',
      pathway_name: null,
      track_name: null,
      combination_code: null,
      combination_name: null,
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCohortSubjects: () => ({
    cohortSubjects: [
      {
        id: 26,
        cohort: 9,
        cohort_id: 9,
        cohort_name: 'Grade 7',
        cohort_level: 'Grade 7',
        subject: 4,
        subject_id: 4,
        subject_name: 'Mathematics',
        subject_code: 'MAT',
        curriculum_name: 'CBC',
        curriculum_type: 'CBE',
        is_compulsory: true,
      },
      {
        id: 27,
        cohort: 9,
        cohort_id: 9,
        cohort_name: 'Grade 7',
        cohort_level: 'Grade 7',
        subject: 5,
        subject_id: 5,
        subject_name: 'Science',
        subject_code: 'SCI',
        curriculum_name: 'CBC',
        curriculum_type: 'CBE',
        is_compulsory: false,
      },
    ],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/app/core/hooks/useAcademicSetupStatus', () => ({
  useAcademicSetupStatus: () => ({ data: null }),
}));

vi.mock('@/app/core/hooks/useCohortStudents', () => ({
  useCohortEnrolledStudents: () => ({
    data: { students: [] },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/app/core/hooks/useCohortSubjectParticipation', () => ({
  useCohortSubjectParticipation: (...args: unknown[]) => mocks.useCohortSubjectParticipation(...args),
}));

vi.mock('@/app/core/hooks/useInstructorCohortAccess', () => ({
  useInstructorCohortAccess: () => mocks.instructorAccess,
}));

vi.mock('@/app/core/components/assistant/useAssistantPageContext', () => ({
  useAssistantPageContext: vi.fn(),
}));

vi.mock('@/app/core/components/cohorts/CohortComponents', () => ({
  ManageCohortSubjectsModal: () => null,
}));

vi.mock('@/app/core/pageIdentity/PageTitleProvider', () => ({
  useSemanticPageTitle: vi.fn(),
}));

import CohortDetailPage from './CohortDetailPage';

function renderPage() {
  mocks.useCohortSubjectParticipation.mockReturnValue({
    summaries: {
      26: {
        counts: { enrolled: 18, available: 2, cohort_total: 20 },
        instructorName: 'Current Teacher',
        instructorState: 'assigned',
      },
      27: {
        counts: { enrolled: 12, available: 8, cohort_total: 20 },
        instructorName: 'Other Teacher',
        instructorState: 'assigned',
      },
    },
    loading: false,
    error: null,
  });

  return renderToStaticMarkup(<CohortDetailPage />);
}

describe('CohortDetailPage instructor and CBC capability presentation', () => {
  beforeEach(() => {
    mocks.auth.activeRole = 'INSTRUCTOR';
    mocks.auth.user = { id: 5, email: 'teacher@example.com' };
    mocks.pluginState.state = 'available';
    mocks.pluginState.message = null;
    mocks.instructorAccess.isTeachingActor = true;
    mocks.instructorAccess.cohortIds = [9];
    mocks.instructorAccess.cohortSubjectIds = [26];
    mocks.useCohortSubjectParticipation.mockReset();
  });

  it('keeps assigned subjects visible but hides the current instructor for institution instructors', () => {
    const html = renderPage();

    expect(html).toContain('Mathematics');
    expect(html).not.toContain('Science');
    expect(html).not.toContain('Current Instructor');
    expect(html).not.toContain('Current Teacher');
    expect(mocks.useCohortSubjectParticipation).toHaveBeenCalledWith(
      9,
      expect.arrayContaining([expect.objectContaining({ id: 26 })]),
      { includeInstructor: false },
    );
  });

  it('shows the instructor column for administrators', () => {
    mocks.auth.activeRole = 'ADMIN';
    mocks.auth.user = { id: 6, email: 'admin@example.com' };
    mocks.instructorAccess.isTeachingActor = false;
    mocks.instructorAccess.cohortSubjectIds = [];

    const html = renderPage();

    expect(html).toContain('Mathematics');
    expect(html).toContain('Science');
    expect(html).toContain('Current Instructor');
    expect(html).toContain('Current Teacher');
    expect(mocks.useCohortSubjectParticipation).toHaveBeenCalledWith(
      9,
      expect.arrayContaining([
        expect.objectContaining({ id: 26 }),
        expect.objectContaining({ id: 27 }),
      ]),
      { includeInstructor: true },
    );
  });

  it('enables CBC subjects and progress when plugin capability is available', () => {
    const html = renderPage();

    expect(html).toContain('CBC Subjects &amp; Outcomes');
    expect(html).toContain('/cbc/browser?cohort=9');
    expect(html).toContain('CBC Progress');
    expect(html).toContain('/cbc/progress?cohort=9');
    expect(html).not.toContain('You are not authorized to verify CBC tools for this organization.');
  });

  it('keeps a genuine CBC plugin authorization failure visible', () => {
    mocks.pluginState.state = 'unauthorized';
    mocks.pluginState.message = 'Forbidden';

    const html = renderPage();

    expect(html).toContain('CBC Subjects &amp; Outcomes');
    expect(html).toContain('You are not authorized to verify CBC tools for this organization.');
    expect(html).not.toContain('/cbc/browser?cohort=9');
    expect(html).not.toContain('/cbc/progress?cohort=9');
  });
});
