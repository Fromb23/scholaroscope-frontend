import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getFreelanceDashboardMoreActions,
  getFreelanceDashboardPrimaryActions,
} from './InstructorDashboard';

describe('freelance dashboard quick actions', () => {
  it('prioritizes lesson preparation and classes', () => {
    expect(getFreelanceDashboardPrimaryActions().map((action) => action.label)).toEqual([
      'Lesson preparations',
      'My classes',
      'Teaching record',
      'Reports / progress',
    ]);
  });

  it('does not show Learners as a primary freelance action', () => {
    expect(getFreelanceDashboardPrimaryActions().map((action) => action.label)).not.toContain('Learners');
  });

  it('keeps setup and learner routes available under More', () => {
    expect(getFreelanceDashboardMoreActions().map((action) => action.label)).toEqual([
      'Academic Setup',
      'Manage class subjects',
      'Learners',
      'Settings',
    ]);
  });

  it('hides lower-priority primary actions on mobile while preserving a More menu', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/dashboard/InstructorDashboard.tsx'),
      'utf8',
    );

    expect(source).toContain("index > 1 ? 'hidden sm:inline-flex' : 'inline-flex'");
    expect(source).toContain('buttonLabel="More"');
    expect(source).toContain('getFreelanceDashboardMoreActions');
  });
});
