import { describe, expect, it } from 'vitest';

import {
  getAdminReportLandingSections,
  getAdminReportNavigationItems,
} from './reportHierarchy';

describe('report hierarchy configuration', () => {
  it('keeps learner, class, subject, and instructor lenses as the primary report entry points', () => {
    const hierarchy = getAdminReportLandingSections();

    expect(hierarchy.primary.map((item) => item.name)).toEqual([
      'Learners',
      'Classes',
      'Subjects',
      'Instructors',
    ]);
  });

  it('keeps attendance secondary and compute in maintenance', () => {
    const hierarchy = getAdminReportLandingSections();

    expect(hierarchy.secondary.map((item) => item.name)).toContain('Scoped Attendance Explorer');
    expect(hierarchy.maintenance.map((item) => item.name)).toEqual(['Compute / Maintenance']);
    expect(hierarchy.primary.map((item) => item.name)).not.toContain('Assessment Reports');
  });

  it('builds sidebar children from the same hierarchy source', () => {
    const items = getAdminReportNavigationItems();

    expect(items.map((item) => item.name)).toEqual([
      'Reports Overview',
      'Learners',
      'Classes',
      'Subjects',
      'Instructor Reports',
      'Scoped Attendance Explorer',
      'Report Policies',
      'Compute / Maintenance',
    ]);
  });
});
