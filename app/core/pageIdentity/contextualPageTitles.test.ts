import { describe, expect, it } from 'vitest';

import {
  getCohortAssignmentsPageTitle,
  getCohortsPageTitle,
  getLearnersPageTitle,
  getProjectStreamsPageTitle,
} from './contextualPageTitles';
import { formatDocumentTitle } from './pageIdentity';

describe('contextual page titles', () => {
  it('refines learner and cohort titles from the active operating context', () => {
    expect(getLearnersPageTitle(false)).toBe('Learners');
    expect(getLearnersPageTitle(true)).toBe('My Learners');
    expect(getCohortsPageTitle('WORKSPACE_MANAGEMENT', 'My Classes')).toBe('Cohorts');
    expect(getCohortsPageTitle('MY_TEACHING', 'My Classes')).toBe('My Classes');
    expect(getCohortsPageTitle('MY_TEACHING', 'My Class')).toBe('My Class');
  });

  it('uses the authorized project title after the project workspace loads', () => {
    expect(getProjectStreamsPageTitle()).toBe('Project Streams');
    expect(formatDocumentTitle(getProjectStreamsPageTitle('Community Garden'))).toBe(
      'Community Garden | Scholaroscope',
    );
  });

  it('includes assignment context only after access is confirmed', () => {
    expect(getCohortAssignmentsPageTitle({
      accessConfirmed: false,
      cohortName: 'Year 8 East',
      subjectName: 'Mathematics',
    })).toBe('Assignments');
    expect(getCohortAssignmentsPageTitle({
      accessConfirmed: true,
      cohortName: 'Year 8 East',
    })).toBe('Assignments — Year 8 East');
    expect(getCohortAssignmentsPageTitle({
      accessConfirmed: true,
      cohortName: 'Year 8 East',
      subjectName: 'Mathematics',
    })).toBe('Assignments — Mathematics — Year 8 East');
  });
});
