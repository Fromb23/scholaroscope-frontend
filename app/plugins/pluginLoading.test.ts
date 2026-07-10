import { describe, expect, it } from 'vitest';

import {
  getRequiredPluginIdsForPath,
  selectPluginManifestEntries,
  type PluginLoadContext,
} from './manifest';
import { loadPluginById } from './loadPlugin';
import {
  getPluginNavigationItems,
  type PluginNavigationContext,
} from '@/app/core/registry/pluginNavigation';
import { renderAssessmentPolicyPreviewExtension } from '@/app/core/registry/assessmentPolicyPreviews';
import { getRouteRules } from '@/app/utils/routeAccess';
import type { ActiveOrg, User, WorkspaceCapabilities } from '@/app/core/types/auth';
import type { AssessmentPolicyPreviewSubject } from '@/app/core/registry/assessmentPolicyPreviews';
import {
  getProductCapability,
  hasPluginCapability,
  hasProductCapability,
} from '@/app/core/lib/productCapabilities';

const institutionOrg: ActiveOrg = {
  id: 1,
  name: 'Institution',
  slug: 'institution',
  org_type: 'INSTITUTION',
};

const personalOrg: ActiveOrg = {
  id: 2,
  name: 'Personal',
  slug: 'personal',
  org_type: 'PERSONAL',
};

const adminUser: User = {
  id: 1,
  email: 'admin@example.test',
  first_name: 'Ada',
  last_name: 'Admin',
  full_name: 'Ada Admin',
  is_superadmin: false,
  is_active: true,
  phone: '',
  date_joined: '2026-01-01T00:00:00Z',
  last_login: '2026-01-01T00:00:00Z',
};

const baseCapabilities: WorkspaceCapabilities = {
  can_teach: true,
  can_manage_academic_setup: true,
  can_manage_learners: true,
  can_manage_cohorts: true,
  can_manage_subjects: true,
  can_manage_assessments: true,
  can_view_reports: true,
  can_manage_staff: true,
  is_workspace_owner: false,
  workspace_mode: 'INSTITUTION',
  workspace_behavior: 'INSTITUTION',
};

const freelanceCapabilities: WorkspaceCapabilities = {
  ...baseCapabilities,
  is_workspace_owner: true,
  workspace_mode: 'PERSONAL',
  workspace_behavior: 'FREELANCE_TEACHER',
};

function buildLoadContext(overrides: Partial<PluginLoadContext> = {}): PluginLoadContext {
  return {
    activeOrg: institutionOrg,
    activeRole: 'ADMIN',
    isSuperadmin: false,
    capabilities: baseCapabilities,
    curriculumTypes: [],
    enabledFeatures: [],
    pathname: '/dashboard/admin',
    ...overrides,
  };
}

function buildNavigationContext(
  overrides: Partial<PluginNavigationContext> = {},
): PluginNavigationContext {
  return {
    role: 'ADMIN',
    orgType: 'INSTITUTION',
    workspaceBehavior: 'INSTITUTION',
    canTeach: true,
    isWorkspaceOwner: false,
    hasPlugin: () => false,
    hasCurriculumType: () => false,
    badges: {},
    curricula: [],
    user: adminUser,
    capabilities: baseCapabilities,
    instructorAccess: {
      hasCurriculumAccess: () => true,
    },
    ...overrides,
  };
}

function itemNames(slot: Parameters<typeof getPluginNavigationItems>[0], context: PluginNavigationContext) {
  return getPluginNavigationItems(slot, context).map((item) => item.name);
}

function capability(enabled: boolean, source: 'PLATFORM_DEFAULT' | 'WORKSPACE_STANDARD' | 'PREMIUM' = 'PREMIUM') {
  return { enabled, source };
}

function selectedIds(overrides: Partial<PluginLoadContext> = {}) {
  return selectPluginManifestEntries(buildLoadContext(overrides)).map((entry) => entry.id);
}

describe('selective plugin loading manifest', () => {
  it('selects CBC without selecting Cambridge for a CBC-only curriculum context', () => {
    const ids = selectedIds({
      curriculumTypes: ['CBE'],
      enabledFeatures: ['cbc'],
    });

    expect(ids).toContain('cbc');
    expect(ids).not.toContain('cambridge');
  });

  it('selects Cambridge for a Cambridge curriculum context', () => {
    const ids = selectedIds({
      curriculumTypes: ['CAMBRIDGE'],
      enabledFeatures: ['cambridge'],
    });

    expect(ids).toContain('cambridge');
  });

  it('marks plugin routes as requiring their plugin before route rules can grant access', () => {
    expect(getRequiredPluginIdsForPath('/cbc/progress')).toEqual(['cbc']);
    expect(getRequiredPluginIdsForPath('/cambridge/setup')).toEqual(['cambridge']);
    expect(getRequiredPluginIdsForPath('/requests/new')).toEqual(['requests']);
    expect(getRequiredPluginIdsForPath('/announcements')).toEqual(['announcements']);
    expect(getRequiredPluginIdsForPath('/schemes/new')).toEqual(['schemes']);
  });

  it('respects request, announcement, and scheme workspace signals', () => {
    const institutionIds = selectedIds();
    const freelanceIds = selectedIds({
      activeOrg: personalOrg,
      capabilities: freelanceCapabilities,
    });
    const schemesIds = selectedIds({
      enabledFeatures: ['schemes'],
    });

    expect(institutionIds).toContain('requests');
    expect(institutionIds).toContain('announcements');
    expect(freelanceIds).toContain('requests');
    expect(freelanceIds).not.toContain('announcements');
    expect(freelanceIds).not.toContain('schemes');
    expect(schemesIds).toContain('schemes');
  });

  it('selects plugins from resolved product capabilities before legacy signals', () => {
    const ids = selectedIds({
      enabledFeatures: [],
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          schemes: capability(true, 'WORKSPACE_STANDARD'),
        },
      },
    });

    expect(ids).toContain('schemes');
  });

  it('does not select disabled product capabilities without a legacy fallback', () => {
    const ids = selectedIds({
      enabledFeatures: [],
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          schemes: {
            enabled: false,
            source: 'WORKSPACE_STANDARD',
            reason: 'Plugin disabled for this workspace.',
          },
        },
      },
    });

    expect(ids).not.toContain('schemes');
  });

  it('does not let enabled feature keys override explicit disabled capabilities', () => {
    const ids = selectedIds({
      enabledFeatures: ['cbc'],
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          cbc: capability(false),
        },
      },
    });

    expect(ids).not.toContain('cbc');
  });

  it('does not let CBC curriculum type override explicit disabled capability', () => {
    const ids = selectedIds({
      curriculumTypes: ['CBE'],
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          cbc: capability(false),
        },
      },
    });

    expect(ids).not.toContain('cbc');
  });

  it('does not let Cambridge curriculum type override explicit disabled capability', () => {
    const ids = selectedIds({
      curriculumTypes: ['CAMBRIDGE'],
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          cambridge: capability(false),
        },
      },
    });

    expect(ids).not.toContain('cambridge');
  });

  it('does not let announcement workspace-role fallback override explicit disabled capability', () => {
    const ids = selectedIds({
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          announcements: capability(false, 'WORKSPACE_STANDARD'),
        },
      },
    });

    expect(ids).not.toContain('announcements');
  });

  it('does not let requests admin fallback override explicit disabled capability', () => {
    const ids = selectedIds({
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          requests: capability(false, 'WORKSPACE_STANDARD'),
        },
      },
    });

    expect(ids).not.toContain('requests');
  });

  it('does not let route matching override explicit disabled capability', () => {
    const ids = selectedIds({
      pathname: '/cbc/progress',
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          cbc: capability(false),
        },
      },
    });

    expect(ids).not.toContain('cbc');
  });

  it('keeps legacy route fallback when the capability key is absent', () => {
    const ids = selectedIds({
      pathname: '/cbc/progress',
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {},
      },
    });

    expect(ids).toContain('cbc');
  });

  it('keeps legacy installed-feature fallback when the capability key is absent', () => {
    const ids = selectedIds({
      enabledFeatures: ['schemes'],
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {},
      },
    });

    expect(ids).toContain('schemes');
  });

  it('loads explicit enabled capability without legacy signals', () => {
    const ids = selectedIds({
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          cbc: capability(true),
        },
      },
      curriculumTypes: [],
      enabledFeatures: [],
      pathname: '/dashboard/admin',
    });

    expect(ids).toContain('cbc');
  });

  it('loads themes from the platform-default capability', () => {
    const ids = selectedIds({
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          themes: capability(true, 'PLATFORM_DEFAULT'),
        },
      },
    });

    expect(ids).toContain('themes');
  });

  it('does not load themes when explicitly disabled', () => {
    const ids = selectedIds({
      pathname: '/settings',
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          themes: capability(false, 'PLATFORM_DEFAULT'),
        },
      },
    });

    expect(ids).not.toContain('themes');
  });

  it('keeps temporary settings-path fallback when themes capability is absent', () => {
    const ids = selectedIds({
      pathname: '/superadmin/settings',
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {},
      },
    });

    expect(ids).toContain('themes');
  });
});

describe('product capability helpers', () => {
  it('reads product_capabilities and effective_capabilities aliases', () => {
    const capabilities: WorkspaceCapabilities = {
      ...baseCapabilities,
      product_capabilities: {
        announcements: {
          enabled: true,
          source: 'WORKSPACE_STANDARD',
        },
      },
      effective_capabilities: {
        cbc: {
          enabled: true,
          source: 'PREMIUM',
        },
      },
    };

    expect(hasProductCapability(capabilities, 'announcements')).toBe(true);
    expect(getProductCapability(capabilities, 'cbc')?.source).toBe('PREMIUM');
  });

  it('does not lose explicit denials when capability aliases disagree', () => {
    const capabilities: WorkspaceCapabilities = {
      ...baseCapabilities,
      product_capabilities: {
        cbc: capability(false),
      },
      effective_capabilities: {
        cbc: capability(true),
        cambridge: capability(true),
      },
    };

    expect(hasProductCapability(capabilities, 'cbc')).toBe(false);
    expect(getProductCapability(capabilities, 'cbc')?.enabled).toBe(false);
    expect(hasProductCapability(capabilities, 'cambridge')).toBe(true);
  });

  it('falls back to active installed plugin feature keys during migration', () => {
    expect(hasPluginCapability({
      capabilities: baseCapabilities,
      enabledFeatures: ['cbc'],
    }, 'cbc')).toBe(true);
  });

  it('does not let active installed feature keys override explicit denials', () => {
    expect(hasPluginCapability({
      capabilities: {
        ...baseCapabilities,
        product_capabilities: {
          cbc: capability(false),
        },
      },
      enabledFeatures: ['cbc'],
    }, 'cbc')).toBe(false);
  });
});

describe('selective plugin registration', () => {
  it('does not duplicate navigation entries after repeated CBC loads', async () => {
    await loadPluginById('cbc');
    const context = buildNavigationContext({
      hasPlugin: (pluginKey) => pluginKey === 'cbc',
      hasCurriculumType: (curriculumType) => curriculumType === 'CBE',
    });
    const firstItems = getPluginNavigationItems('admin.primary.afterAssessments', context);

    await loadPluginById('cbc');
    const secondItems = getPluginNavigationItems('admin.primary.afterAssessments', context);
    const secondHrefs = secondItems.map((item) => item.href);

    expect(secondItems.map((item) => item.name)).toEqual(firstItems.map((item) => item.name));
    expect(new Set(secondHrefs).size).toBe(secondHrefs.length);
  }, 10_000);

  it('registers CBC route access and report policy preview when CBC is loaded', async () => {
    await loadPluginById('cbc');

    const cbcRule = getRouteRules().find((rule) => rule.pattern.test('/cbc/progress'));
    expect(cbcRule?.allowedRoles).toEqual(['ADMIN', 'INSTRUCTOR']);

    const subject: AssessmentPolicyPreviewSubject = {
      id: 1,
      cohort: 1,
      cohort_name: 'Grade 4',
      cohort_level: 'Grade 4',
      subject: 1,
      subject_name: 'Integrated Science',
      subject_code: 'SCI',
      curriculum_name: 'CBC',
      curriculum_type: 'CBE',
      is_compulsory: true,
    };

    const preview = renderAssessmentPolicyPreviewExtension({
      cohortId: 1,
      cohortSubjectId: 1,
      termId: 1,
      subject,
    });

    expect(preview).not.toBeNull();
  });

  it('registers Cambridge navigation and route access when Cambridge is loaded', async () => {
    await loadPluginById('cambridge');

    const context = buildNavigationContext({
      hasPlugin: (pluginKey) => pluginKey === 'cambridge',
      hasCurriculumType: (curriculumType) => curriculumType === 'CAMBRIDGE',
    });
    const names = itemNames('admin.primary.afterAssessments', context);
    const cambridgeRule = getRouteRules().find((rule) => rule.pattern.test('/cambridge/setup'));

    expect(names).toContain('Cambridge Management');
    expect(cambridgeRule?.allowedRoles).toEqual(['ADMIN', 'INSTRUCTOR']);
  });

  it('keeps requests, announcements, and schemes navigation behind existing workspace behavior', async () => {
    await loadPluginById('requests');
    await loadPluginById('announcements');
    await loadPluginById('schemes');

    expect(itemNames('admin.primary.afterDashboard', buildNavigationContext())).toContain('Pending Requests');
    expect(itemNames('admin.secondary.beforeSettings', buildNavigationContext())).toContain('Announcements');
    expect(itemNames('admin.secondary.beforeSettings', buildNavigationContext({
      orgType: 'PERSONAL',
      workspaceBehavior: 'FREELANCE_TEACHER',
    }))).not.toContain('Announcements');
    expect(itemNames('admin.primary.afterDashboard', buildNavigationContext({
      hasPlugin: (pluginKey) => pluginKey === 'schemes',
    }))).toContain('Schemes of Work');
    expect(itemNames('admin.primary.afterDashboard', buildNavigationContext({
      hasPlugin: () => false,
    }))).not.toContain('Schemes of Work');
  });
});
