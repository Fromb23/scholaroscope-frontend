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

  it('keeps lesson preparation primary and learners secondary', () => {
    expect(getFreelanceDashboardPrimaryActions().map((action) => action.label)).toContain('Lesson preparations');
    expect(getFreelanceDashboardPrimaryActions().map((action) => action.label)).not.toContain('Learners');
    expect(getFreelanceDashboardMoreActions().map((action) => action.label)).toContain('Learners');
  });

  it('hides lower-priority primary actions on mobile while preserving a More menu', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/dashboard/InstructorDashboard.tsx'),
      'utf8',
    );

    expect(source).toContain("quiet || index <= 1 ? 'inline-flex' : 'hidden sm:inline-flex'");
    expect(source).toContain('buttonLabel="More"');
    expect(source).toContain('getFreelanceDashboardMoreActions');
  });

  it('renders the primary teaching action before workspace shortcuts', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/dashboard/InstructorDashboard.tsx'),
      'utf8',
    );

    expect(source.indexOf('<TeacherNextActionPanel')).toBeGreaterThan(-1);
    expect(source.indexOf('<TeachingWorkspaceCard')).toBeGreaterThan(-1);
    expect(source.indexOf('<TeacherNextActionPanel')).toBeLessThan(source.indexOf('<TeachingWorkspaceCard'));
  });

  it('uses the central teaching action queue with assignment workflow memory', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/dashboard/InstructorDashboard.tsx'),
      'utf8',
    );

    expect(source).toContain('buildTeachingActionQueue');
    expect(source).toContain('assignmentWork');
    expect(source).toContain('sessionReminders: sessionReminderState.reminders');
  });
});
