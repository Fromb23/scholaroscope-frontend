import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/core/registry/pluginNavigation', () => ({
  getPluginNavigationItems: () => [],
}));

vi.mock('@/app/core/lib/workspaces', () => ({
  getWorkspaceManagementLabel: () => 'Workspace',
  isLearnerCenteredWorkspace: (orgType?: string | null) => orgType === 'LEARNER_WORKSPACE',
  isPersonalFreelancerWorkspace: (orgType?: string | null) => orgType === 'PERSONAL',
  isSelfManagedWorkspace: (orgType?: string | null) => (
    orgType === 'PERSONAL' || orgType === 'INDEPENDENT_TEACHER' || orgType === 'HOMESCHOOL'
  ),
  isSelfManagedTeachingWorkspace: ({ orgType, capabilities }: { orgType?: string | null; capabilities?: { can_teach?: boolean; workspace_behavior?: string | null } | null }) => (
    capabilities?.workspace_behavior === 'FREELANCE_TEACHER'
    || capabilities?.workspace_behavior === 'SELF_MANAGED'
    || orgType === 'PERSONAL'
    || orgType === 'INDEPENDENT_TEACHER'
    || orgType === 'HOMESCHOOL'
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

const soloGovernanceCapabilities = {
  can_teach: true,
  can_manage_academic_setup: true,
  can_manage_learners: true,
  can_manage_cohorts: true,
  can_manage_subjects: true,
  can_manage_assessments: true,
  can_view_reports: true,
  can_manage_staff: false,
  is_workspace_owner: true,
  workspace_mode: 'PERSONAL',
  workspace_behavior: 'FREELANCE_TEACHER',
  workspace_governance: {
    mode: 'SOLO_OWNER' as const,
    supports_custom_roles: false,
    supports_staff_management: false,
    supports_announcements: false,
    supports_internal_requests: false,
    supports_internal_approvals: false,
    default_action_authority: 'DIRECT' as const,
  },
  authorization: {
    enforced: true,
    permission_keys: ['workspace.roles.view'],
    roles: [],
    admin_slots: null,
    migration_state: null,
  },
};

let getAdminNav: typeof import('./navConfig').getAdminNav;
let getInstructorNav: typeof import('./navConfig').getInstructorNav;
let resolveMobilePrimaryNav: typeof import('./navConfig').resolveMobilePrimaryNav;

beforeAll(async () => {
  ({ getAdminNav, getInstructorNav, resolveMobilePrimaryNav } = await import('./navConfig'));
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
      'Reports Overview',
      'Learners',
      'Classes',
      'Subjects',
      'Instructor Reports',
      'Scoped Attendance Explorer',
      'Report Policies',
      'Compute / Maintenance',
    ]);
    expect(nav.primary.some((item) => item.name === 'Learners' && item.href === '/learners')).toBe(true);
  });

  it('uses class-owned navigation for future self-managed workspace behavior', () => {
    const nav = getAdminNav(pluginContext, 'HOMESCHOOL', null, {
      can_teach: true,
      can_manage_academic_setup: true,
      can_manage_learners: true,
      can_manage_cohorts: true,
      can_manage_subjects: true,
      can_manage_assessments: true,
      can_view_reports: true,
      can_manage_staff: false,
      is_workspace_owner: true,
      workspace_mode: 'SELF_MANAGED',
      workspace_behavior: 'SELF_MANAGED',
    });

    expect(nav.primary.some((item) => item.name === 'My teaching record')).toBe(false);
    expect(nav.primary.some((item) => item.name === 'My lesson plans')).toBe(false);
    expect(nav.primary.find((item) => item.name === 'Academic Setup')?.children?.find((item) => item.href === '/academic/cohorts')?.name).toBe('My classes');
  });

  it('shows freelance teacher navigation for personal workspaces', () => {
    const nav = getAdminNav(pluginContext, 'PERSONAL', {
      complete: true,
      current_step_label: null,
      next_action: {
        label: 'Open admin dashboard',
        href: '/dashboard/admin',
      },
    }, {
      can_teach: true,
      can_manage_academic_setup: true,
      can_manage_learners: true,
      can_manage_cohorts: true,
      can_manage_subjects: true,
      can_manage_assessments: true,
      can_view_reports: true,
      can_manage_staff: false,
      is_workspace_owner: true,
      workspace_mode: 'FREELANCE_TEACHER',
      workspace_behavior: 'FREELANCE_TEACHER',
    });

    expect(nav.primary.map((item) => item.name)).toEqual([
      'My teaching workspace',
      'Lesson preparations',
      'Academic Setup',
    ]);
    expect(nav.primary.some((item) => item.name === 'My learners')).toBe(false);
    expect(nav.primary.find((item) => item.name === 'Lesson preparations')?.href).toBe('/lesson-plans');
    const academicSetup = nav.primary.find((item) => item.name === 'Academic Setup');
    expect(academicSetup?.children?.map((item) => item.name)).toEqual([
      'Curricula',
      'Academic years',
      'Terms',
      'My classes',
    ]);
    expect(academicSetup?.children?.find((item) => item.href === '/academic/cohorts')?.name).toBe('My classes');
    expect(nav.primary.filter((item) => item.href === '/academic/cohorts')).toHaveLength(0);
    expect(nav.primary.some((item) => item.href === '/reports/policies')).toBe(false);
    expect(nav.primary.some((item) => item.name === 'Instructors')).toBe(false);
    expect(nav.primary.some((item) => item.name === 'System Alerts')).toBe(false);
    for (const removed of [
      'Schemes of work',
      'My teaching record',
      'My lesson plans',
      'My assessments',
      'My reports',
    ]) {
      expect(nav.primary.some((item) => item.name === removed)).toBe(false);
    }
    expect(nav.secondary?.map((item) => item.name)).toEqual(['Settings']);
  });

  it('prioritizes freelance post-setup mobile navigation around daily teaching', () => {
    const nav = getAdminNav(pluginContext, 'PERSONAL', {
      complete: true,
      current_step_label: null,
      next_action: {
        label: 'Open admin dashboard',
        href: '/dashboard/admin',
      },
    }, {
      can_teach: true,
      can_manage_academic_setup: true,
      can_manage_learners: true,
      can_manage_cohorts: true,
      can_manage_subjects: true,
      can_manage_assessments: true,
      can_view_reports: true,
      can_manage_staff: false,
      is_workspace_owner: true,
      workspace_mode: 'FREELANCE_TEACHER',
      workspace_behavior: 'FREELANCE_TEACHER',
    });

    const mobileItems = resolveMobilePrimaryNav(nav);

    expect(mobileItems.map((item) => item.name)).toEqual([
      'My teaching workspace',
      'Lesson preparations',
      'My classes',
      'Assessments',
    ]);
    expect(mobileItems.map((item) => item.shortName ?? item.name)).toEqual([
      'Home',
      'Prepare',
      'Classes',
      'Assess',
    ]);
    expect(mobileItems.some((item) => item.name === 'Academic Setup')).toBe(false);
    expect(nav.primary.map((item) => item.name)).toEqual([
      'My teaching workspace',
      'Lesson preparations',
      'Academic Setup',
    ]);
  });

  it('keeps personal workspaces in guided setup until schemes are ready', () => {
    const nav = getAdminNav(pluginContext, 'PERSONAL', {
      complete: false,
      current_step_label: 'Set up schemes of work',
      next_action: {
        label: 'Set up schemes of work',
        href: '/schemes?setup=1',
      },
    }, {
      can_teach: true,
      can_manage_academic_setup: true,
      can_manage_learners: true,
      can_manage_cohorts: true,
      can_manage_subjects: true,
      can_manage_assessments: true,
      can_view_reports: true,
      can_manage_staff: false,
      is_workspace_owner: true,
      workspace_mode: 'FREELANCE_TEACHER',
      workspace_behavior: 'FREELANCE_TEACHER',
    });

    expect(nav.primary.map((item) => item.name)).toEqual([
      'My teaching workspace',
      'Academic Setup',
    ]);
    expect(nav.primary.at(-1)?.children?.map((item) => item.name)).toEqual([
      'Overview',
      'Set up schemes of work',
    ]);
    expect(nav.primary.at(-1)?.children?.at(-1)?.href).toBe('/schemes?setup=1');
  });

  it('leads mobile navigation with setup while freelance setup is incomplete', () => {
    const nav = getAdminNav(pluginContext, 'PERSONAL', {
      complete: false,
      current_step_label: 'Set up schemes of work',
      next_action: {
        label: 'Set up schemes of work',
        href: '/schemes?setup=1',
      },
    }, {
      can_teach: true,
      can_manage_academic_setup: true,
      can_manage_learners: true,
      can_manage_cohorts: true,
      can_manage_subjects: true,
      can_manage_assessments: true,
      can_view_reports: true,
      can_manage_staff: false,
      is_workspace_owner: true,
      workspace_mode: 'FREELANCE_TEACHER',
      workspace_behavior: 'FREELANCE_TEACHER',
    });

    expect(resolveMobilePrimaryNav(nav).map((item) => item.name)).toEqual([
      'Academic Setup',
      'My teaching workspace',
    ]);
    expect(resolveMobilePrimaryNav(nav).map((item) => item.shortName ?? item.name)).toEqual([
      'Setup',
      'Home',
    ]);
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
    ]);
    expect(nav.primary.at(-1)?.children?.map((item) => item.name)).toEqual([
      'Overview',
      'Set up academic year',
    ]);
    expect(resolveMobilePrimaryNav(nav).map((item) => item.name)).toEqual([
      'Academic Setup',
      'Dashboard',
    ]);
    expect(nav.secondary?.map((item) => item.name)).toEqual(['Settings']);
  });

  it('hides workspace role management when governance marks it not applicable', () => {
    const nav = getAdminNav(pluginContext, 'PERSONAL', null, soloGovernanceCapabilities);

    expect(nav.secondary?.map((item) => item.name)).not.toContain('Workspace Roles');
  });

  it('prioritizes institution admin mobile navigation for daily oversight', () => {
    const nav = getAdminNav(pluginContext, 'INSTITUTION');

    expect(resolveMobilePrimaryNav(nav).map((item) => item.name)).toEqual([
      'Dashboard',
      'Learners',
      'Assessment Overview',
      'Reports',
    ]);
    expect(resolveMobilePrimaryNav(nav).map((item) => item.shortName ?? item.name)).toEqual([
      'Home',
      'Learners',
      'Assess',
      'Reports',
    ]);
  });

  it('renames instructor dashboard navigation during midterm modes', () => {
    expect(getInstructorNav(pluginContext, 'MIDTERM_BREAK').primary[0]).toMatchObject({
      name: 'Midterm Break',
      href: '/dashboard/instructor',
    });
    expect(getInstructorNav(pluginContext, 'MIDTERM_EXAM').primary[0]).toMatchObject({
      name: 'Midterm Exams',
      href: '/dashboard/instructor',
    });
    expect(getInstructorNav(pluginContext, 'TEACHING').primary[0]).toMatchObject({
      name: 'Teaching Today',
      href: '/dashboard/instructor',
    });
  });

  it('prioritizes instructor mobile navigation around teaching actions', () => {
    const nav = getInstructorNav(pluginContext, 'MIDTERM_EXAM');

    expect(resolveMobilePrimaryNav(nav).map((item) => item.name)).toEqual([
      'Midterm Exams',
      'Lesson Preparation',
      'My Lessons',
      'Assessments & Grading',
    ]);
    expect(resolveMobilePrimaryNav(nav).map((item) => item.shortName ?? item.name)).toEqual([
      'Home',
      'Prepare',
      'Lessons',
      'Assess',
    ]);
  });

  it('hides instructor internal request navigation when governance marks it not applicable', () => {
    const nav = getInstructorNav({
      ...pluginContext,
      capabilities: soloGovernanceCapabilities,
    }, 'TEACHING');

    expect(nav.secondary?.map((item) => item.name)).not.toContain('Submit Request');
  });

});
