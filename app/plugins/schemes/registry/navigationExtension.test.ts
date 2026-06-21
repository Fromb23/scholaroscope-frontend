import { describe, expect, it } from 'vitest';
import { getPluginNavigationItems, type PluginNavigationContext } from '@/app/core/registry/pluginNavigation';
import './navigationExtension';

const baseContext: PluginNavigationContext = {
  role: 'ADMIN',
  orgType: 'INSTITUTION',
  workspaceBehavior: null,
  canTeach: false,
  isWorkspaceOwner: false,
  hasPlugin: (key) => key === 'schemes',
  hasCurriculumType: () => false,
  badges: {},
  curricula: [],
};

describe('schemes navigation extension', () => {
  it('does not show create draft scheme in institutional admin navigation', () => {
    const items = getPluginNavigationItems('admin.primary.afterDashboard', baseContext);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Schemes of Work');
    expect(items[0].children).toBeUndefined();
  });

  it('shows scheme creation for self-managed teaching admin navigation', () => {
    const items = getPluginNavigationItems('admin.primary.afterDashboard', {
      ...baseContext,
      orgType: 'PERSONAL',
      workspaceBehavior: 'FREELANCE_TEACHER',
      canTeach: true,
      isWorkspaceOwner: true,
    });
    expect(items[0].name).toBe('My schemes of work');
    expect(items[0].children?.map((item) => item.name)).toEqual([
      'My schemes of work',
      'Create Draft Scheme',
    ]);
  });

  it('shows scheme creation in instructor navigation', () => {
    const items = getPluginNavigationItems('instructor.primary.afterDashboard', {
      ...baseContext,
      role: 'INSTRUCTOR',
      canTeach: true,
    });
    expect(items[0].children?.some((item) => item.name === 'Create Draft Scheme')).toBe(true);
  });
});
