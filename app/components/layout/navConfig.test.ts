import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/core/registry/pluginNavigation', () => ({
  getPluginNavigationItems: () => [],
}));

vi.mock('@/app/core/lib/workspaces', () => ({
  getWorkspaceManagementLabel: () => 'Workspace',
  isLearnerCenteredWorkspace: (orgType?: string | null) => orgType === 'LEARNER_WORKSPACE',
  isSelfManagedWorkspace: (orgType?: string | null) => (
    orgType === 'PERSONAL' || orgType === 'INDEPENDENT_TEACHER' || orgType === 'HOMESCHOOL'
  ),
}));

const pluginContext = {
  role: 'ADMIN' as const,
  hasPlugin: () => false,
  hasCurriculumType: () => false,
  badges: {},
  curricula: [],
  hasAnyReportPolicySurface: false,
};

let getAdminNav: typeof import('./navConfig').getAdminNav;

beforeAll(async () => {
  ({ getAdminNav } = await import('./navConfig'));
});

describe('admin navigation config', () => {
  it('renames institutional admin teaching surfaces to supervision labels', () => {
    const nav = getAdminNav(pluginContext, 'INSTITUTION');
    const assessmentItem = nav.primary.find((item) => item.href === '/assessments');
    const reportsItem = nav.primary.find((item) => item.href === '/reports');

    expect(nav.primary.some((item) => item.name === 'Lesson Supervision')).toBe(true);
    expect(nav.primary.some((item) => item.name === 'Lesson Plan Review')).toBe(true);
    expect(assessmentItem?.name).toBe('Assessment Overview');
    expect(assessmentItem?.children?.some((item) => item.href === '/assessments/new')).toBe(false);
    expect(reportsItem?.children?.map((item) => item.name)).toEqual([
      'Overview',
      'Learners',
      'Classes',
      'Subjects',
      'Instructors',
      'Scoped Attendance Explorer',
      'Report Policies',
      'Compute / Maintenance',
    ]);
  });

  it('keeps self-managed admin teaching labels intact', () => {
    const nav = getAdminNav(pluginContext, 'HOMESCHOOL');

    expect(nav.primary.some((item) => item.name === 'Teaching Sessions')).toBe(true);
    expect(nav.primary.some((item) => item.name === 'Lesson Plans')).toBe(true);
  });

  it('removes create-new assessment child for tuition-center admins', () => {
    const nav = getAdminNav(pluginContext, 'TUITION_CENTER');
    const assessmentItem = nav.primary.find((item) => item.href === '/assessments');

    expect(assessmentItem?.name).toBe('Assessment Overview');
    expect(assessmentItem?.children?.some((item) => item.href === '/assessments/new')).toBe(false);
  });

  it('reduces admin navigation to setup surfaces while academic setup is incomplete', () => {
    const nav = getAdminNav(pluginContext, 'INSTITUTION', {
      complete: false,
      current_step_label: 'Create current academic year',
      next_action: {
        label: 'Create current academic year',
        href: '/academic/years?setup=1&create=1',
      },
    });

    expect(nav.primary.map((item) => item.name)).toEqual([
      'Dashboard',
      'Academic Setup',
      'Create current academic year',
    ]);
    expect(nav.secondary?.map((item) => item.name)).toEqual(['Settings']);
  });
});
