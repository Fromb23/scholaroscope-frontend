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

  it('renders active assignment work from the shared queue before generic follow-ups', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/dashboard/InstructorDashboard.tsx'),
      'utf8',
    );
    const primaryIndex = source.indexOf('<TeacherNextActionPanel');
    const assignmentPanelIndex = source.indexOf('<TeachingAssignmentWorkPanel');
    const followUpIndex = source.indexOf('<TeachingFollowUpQueue');
    const workspaceIndex = source.indexOf('<TeachingWorkspaceCard');

    expect(assignmentPanelIndex).toBeGreaterThan(primaryIndex);
    expect(assignmentPanelIndex).toBeLessThan(followUpIndex);
    expect(assignmentPanelIndex).toBeLessThan(workspaceIndex);
    expect(source).toContain('queue.actions.filter((action) => (');
    expect(source).toContain("action.objectType === 'assignment'");
  });

  it('does not rely on the sliced generic follow-up queue for assignment visibility', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/dashboard/InstructorDashboard.tsx'),
      'utf8',
    );

    expect(source).toContain("filter((action) => action.objectType !== 'assignment')");
    expect(source).toContain('ASSIGNMENT_WORK_VISIBLE_LIMIT = 5');
    expect(source).toContain('View all assignment work');
    expect(source).toContain('collapsedCount');
  });

  it('renders lesson-originated assignment work with teacher-facing labels', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/dashboard/InstructorDashboard.tsx'),
      'utf8',
    );

    expect(source).toContain('Prepared from lesson plan');
    expect(source).toContain('Learner task from lesson preparation');
    expect(source).toContain('Prepared learner task');
    expect(source).toContain('Issued learner task');
    expect(source).toContain('Evidence pending');
    expect(source).toContain('Ready to store');
  });

  it('marks a primary assignment action as shown above instead of duplicating its CTA', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/dashboard/InstructorDashboard.tsx'),
      'utf8',
    );

    expect(source).toContain('isPrimaryActionObject ? (');
    expect(source).toContain('Shown above');
    expect(source).toContain('action.primaryLabel');
  });

  it('keeps workspace shortcuts muted while assignment work exists', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/dashboard/InstructorDashboard.tsx'),
      'utf8',
    );

    expect(source).toContain('quiet={teachingActionQueue.quiet && assignmentWork.length === 0}');
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

  it('uses useInstructorDashboard assignmentWork from useAssignmentTeachingToday', () => {
    const hookSource = readFileSync(
      join(process.cwd(), 'app/core/hooks/useInstructorDashboard.ts'),
      'utf8',
    );

    expect(hookSource).toContain('useAssignmentTeachingToday');
    expect(hookSource).toContain('items: assignmentWork');
    expect(hookSource).toContain('refetchAssignmentWork');
    expect(hookSource).toContain('assignmentWork,');
  });
});
