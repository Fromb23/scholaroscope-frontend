import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { PluginNavigationContext } from '@/app/core/registry/pluginNavigation';
import type { AcademicTodayModeValue } from '@/app/core/types/academic';
import type { OrgType, User, WorkspaceCapabilities } from '@/app/core/types/auth';
import type { ResolveNavConfigInput } from './navConfig';

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
  activeOperatingContext: null,
  hasPlugin: () => false,
  hasCurriculumType: () => false,
  badges: {},
  curricula: [],
  hasAnyReportPolicySurface: false,
} satisfies PluginNavigationContext;

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

const managementPermissionKeys = [
  'workspace.settings.view',
  'workspace.settings.manage',
  'workspace.members.view',
  'workspace.members.manage',
  'workspace.roles.view',
  'academic.view',
  'academic.curricula.view',
  'academic.years.view',
  'academic.terms.view',
  'academic.subjects.view',
  'academic.cohorts.view',
  'learners.view',
  'learners.manage',
  'lessons.view',
  'lessons.review',
  'attendance.view',
  'assessments.view',
  'assessments.create',
  'assessments.review',
  'reports.view',
  'reports.compute',
  'reports.manage_policy',
  'workspace.audit.view',
];

function capabilitiesWithKeys(
  keys: string[],
  overrides: Partial<WorkspaceCapabilities> = {},
): WorkspaceCapabilities {
  return {
    can_teach: false,
    can_manage_academic_setup: keys.some((key) => key.startsWith('academic.') && key.endsWith('.manage')),
    can_manage_learners: keys.includes('learners.manage'),
    can_manage_cohorts: keys.includes('academic.cohorts.manage'),
    can_manage_subjects: keys.includes('academic.subjects.manage'),
    can_manage_assessments: keys.includes('assessments.manage'),
    can_view_reports: keys.includes('reports.view'),
    can_manage_staff: keys.includes('workspace.members.manage'),
    is_workspace_owner: false,
    workspace_mode: 'SCHOOL',
    workspace_behavior: 'MANAGED_TEAM',
    workspace_governance: {
      mode: 'MANAGED_TEAM' as const,
      supports_custom_roles: true,
      supports_staff_management: true,
      supports_announcements: true,
      supports_internal_requests: true,
      supports_internal_approvals: true,
      default_action_authority: 'ROLE_DEPENDENT' as const,
    },
    authorization: {
      enforced: true,
      permission_keys: keys,
      roles: [],
      admin_slots: null,
      migration_state: null,
    },
    report_configuration: {
      report_policy_available: keys.includes('reports.manage_policy'),
      report_policy_mode: 'INSTITUTION_GOVERNANCE',
      report_computation_available: keys.includes('reports.compute'),
      report_computation_class_scoped_only: false,
      subject_profile_authoring_allowed: false,
      reporting_governance_routes_allowed: true,
      allowed_policy_scopes: [],
    },
    ...overrides,
  } as WorkspaceCapabilities;
}

const broadManagementCapabilities = capabilitiesWithKeys(managementPermissionKeys, {
  can_manage_academic_setup: true,
  can_manage_learners: true,
  can_manage_cohorts: true,
  can_manage_subjects: true,
  can_manage_assessments: true,
  can_view_reports: true,
  can_manage_staff: true,
});

const broadTeachingCapabilities = capabilitiesWithKeys([
  'lessons.view',
  'lessons.prepare',
  'attendance.view',
  'attendance.record',
  'academic.cohorts.view',
  'learners.view',
  'assessments.view',
  'assessments.create',
  'reports.view',
  'requests.create',
], {
  can_teach: true,
  workspace_behavior: 'TEACHING',
});

function normalizeTestCapabilities(
  capabilities: WorkspaceCapabilities | null | undefined,
  fallback: WorkspaceCapabilities,
): WorkspaceCapabilities {
  if (!capabilities) return fallback;
  if (capabilities.authorization) return capabilities;
  return {
    ...fallback,
    ...capabilities,
    authorization: fallback.authorization,
  } as WorkspaceCapabilities;
}

let resolveNavConfig: typeof import('./navConfig').resolveNavConfig;
let resolveMobilePrimaryNav: typeof import('./navConfig').resolveMobilePrimaryNav;

beforeAll(async () => {
  ({ resolveNavConfig, resolveMobilePrimaryNav } = await import('./navConfig'));
});

function testUser() {
  return {
    id: 1,
    email: 'user@example.com',
    first_name: 'Test',
    last_name: 'User',
    full_name: 'Test User',
    is_superadmin: false,
    is_active: true,
    phone: '',
    date_joined: '2026-01-01T00:00:00Z',
    last_login: '2026-01-01T00:00:00Z',
  } satisfies User;
}

function getAdminNav(
  context: Partial<PluginNavigationContext> = pluginContext,
  orgType?: OrgType | null,
  academicSetup?: ResolveNavConfigInput['academicSetup'],
  capabilities?: WorkspaceCapabilities | null,
) {
  const nextContext = {
    ...context,
    activeOperatingContext: 'WORKSPACE_MANAGEMENT' as const,
    orgType,
    capabilities: normalizeTestCapabilities(
      capabilities ?? context.capabilities ?? null,
      broadManagementCapabilities,
    ),
  };
  return resolveNavConfig({
    user: testUser(),
    activeOperatingContext: 'WORKSPACE_MANAGEMENT',
    orgType,
    pluginNavigationContext: nextContext as PluginNavigationContext,
    academicSetup,
    capabilities: nextContext.capabilities,
  });
}

function getInstructorNav(
  context: Partial<PluginNavigationContext> = pluginContext,
  academicTodayMode?: AcademicTodayModeValue | null,
  instructorAssignedCohortCount?: number | null,
  capabilities?: WorkspaceCapabilities | null,
) {
  const nextContext = {
    ...context,
    activeOperatingContext: 'MY_TEACHING' as const,
    capabilities: normalizeTestCapabilities(
      capabilities ?? context.capabilities ?? null,
      broadTeachingCapabilities,
    ),
  };
  return resolveNavConfig({
    user: testUser(),
    activeOperatingContext: 'MY_TEACHING',
    pluginNavigationContext: nextContext as PluginNavigationContext,
    capabilities: nextContext.capabilities,
    academicTodayMode,
    instructorAssignedCohortCount,
  });
}

function allNavHrefs(nav: ReturnType<typeof getAdminNav>): string[] {
  const collect = (items = nav.primary): string[] => items.flatMap((item) => [
    item.href,
    ...collect(item.children ?? []),
  ]);
  return [
    ...collect(nav.primary),
    ...collect(nav.secondary ?? []),
    ...collect(nav.mobilePrimary ?? []),
  ];
}

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

  it('labels institution people management as Staff without changing the instructors route', () => {
    const nav = getAdminNav(pluginContext, 'INSTITUTION');
    const staffItem = nav.primary.find((item) => item.href === '/admin/instructors');

    expect(staffItem?.name).toBe('Staff');
    expect(nav.primary.some((item) => item.name === 'Instructors')).toBe(false);
    expect(nav.secondary?.find((item) => item.href === '/admin/instructors')?.name).toBe('Staff Activity');
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
    expect(nav.secondary?.map((item) => item.name)).toEqual(['Workspace Roles', 'Settings']);
  });

  it('hides workspace role management when governance marks it not applicable', () => {
    const nav = getAdminNav(pluginContext, 'PERSONAL', null, soloGovernanceCapabilities);

    expect(nav.secondary?.map((item) => item.name) ?? []).not.toContain('Workspace Roles');
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

  it('shows Revenue cycle navigation only from backend revenue capability', () => {
    const withoutRevenue = getAdminNav(pluginContext, 'INSTITUTION', null, {
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
      workspace_behavior: 'MANAGED_TEAM',
    });
    const withRevenue = getAdminNav(pluginContext, 'INSTITUTION', null, {
      can_teach: false,
      can_manage_academic_setup: true,
      can_manage_learners: true,
      can_manage_cohorts: true,
      can_manage_subjects: true,
      can_manage_assessments: true,
      can_view_reports: true,
      can_manage_staff: true,
      can_view_revenue_program: true,
      is_workspace_owner: false,
      workspace_mode: 'SCHOOL',
      workspace_behavior: 'MANAGED_TEAM',
      authorization: {
        enforced: true,
        permission_keys: [...managementPermissionKeys, 'revenue.program.view'],
        roles: [],
        admin_slots: null,
        migration_state: null,
      },
    });

    expect(withoutRevenue.primary.some((item) => item.href === '/revenue')).toBe(false);
    expect(withRevenue.primary.find((item) => item.href === '/revenue')?.name).toBe('Revenue cycle');
  });

  it('does not expose unrelated management navigation for a learners-only manager', () => {
    const nav = getAdminNav(pluginContext, 'INSTITUTION', null, capabilitiesWithKeys(['learners.manage']));
    const hrefs = allNavHrefs(nav);

    expect(hrefs).toContain('/learners');
    expect(hrefs).not.toContain('/reports');
    expect(hrefs).not.toContain('/admin/instructors');
    expect(hrefs).not.toContain('/academic/subjects');
  });

  it('does not expose unrelated management navigation for a reports-only viewer', () => {
    const nav = getAdminNav(pluginContext, 'INSTITUTION', null, capabilitiesWithKeys(['reports.view']));
    const hrefs = allNavHrefs(nav);

    expect(hrefs).toContain('/reports');
    expect(hrefs).not.toContain('/reports/compute');
    expect(hrefs).not.toContain('/learners');
    expect(hrefs).not.toContain('/admin/instructors');
    expect(hrefs).not.toContain('/academic/subjects');
  });

  it('shows compute navigation only with workspace reports.compute authority', () => {
    const computeNav = getAdminNav(
      pluginContext,
      'INSTITUTION',
      null,
      capabilitiesWithKeys(['reports.view', 'reports.compute']),
    );
    const policyNav = getAdminNav(
      pluginContext,
      'INSTITUTION',
      null,
      capabilitiesWithKeys(['reports.view', 'reports.manage_policy']),
    );

    expect(allNavHrefs(computeNav)).toContain('/reports/compute');
    expect(allNavHrefs(policyNav)).not.toContain('/reports/compute');
  });

  it('does not expose unrelated management navigation for a staff-only manager', () => {
    const nav = getAdminNav(pluginContext, 'INSTITUTION', null, capabilitiesWithKeys(['workspace.members.manage']));
    const hrefs = allNavHrefs(nav);

    expect(hrefs).toContain('/admin/instructors');
    expect(hrefs).not.toContain('/learners');
    expect(hrefs).not.toContain('/reports');
    expect(hrefs).not.toContain('/academic/subjects');
  });

  it('filters academic setup children independently for subject-only viewers', () => {
    const nav = getAdminNav(pluginContext, 'INSTITUTION', null, capabilitiesWithKeys(['academic.subjects.view']));
    const hrefs = allNavHrefs(nav);

    expect(hrefs).toContain('/academic');
    expect(hrefs).toContain('/academic/subjects');
    expect(hrefs).not.toContain('/academic/cohorts');
    expect(hrefs).not.toContain('/learners');
    expect(hrefs).not.toContain('/reports');
  });

  it('hides protected management links when no relevant permissions exist', () => {
    const nav = getAdminNav(pluginContext, 'INSTITUTION', null, capabilitiesWithKeys([]));
    const hrefs = allNavHrefs(nav);

    expect(hrefs).toEqual(['/dashboard/admin']);
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

  it('labels one distinct instructor cohort as My Class', () => {
    const nav = getInstructorNav(pluginContext, 'TEACHING', 1);

    expect(nav.primary.some((item) => item.name === 'My Class' && item.href === '/academic/cohorts')).toBe(true);
    expect(nav.primary.some((item) => item.name === 'My Teaching Load')).toBe(false);
  });

  it('labels zero or multiple distinct instructor cohorts as My Classes', () => {
    expect(getInstructorNav(pluginContext, 'TEACHING', 0).primary.some((item) => (
      item.name === 'My Classes' && item.href === '/academic/cohorts'
    ))).toBe(true);
    expect(getInstructorNav(pluginContext, 'TEACHING', 2).primary.some((item) => (
      item.name === 'My Classes' && item.href === '/academic/cohorts'
    ))).toBe(true);
  });

  it('hides instructor internal request navigation when governance marks it not applicable', () => {
    const nav = getInstructorNav({
      ...pluginContext,
      capabilities: soloGovernanceCapabilities,
    }, 'TEACHING');

    expect(nav.secondary?.map((item) => item.name)).not.toContain('Submit Request');
  });

});
