import { describe, expect, it } from 'vitest';

import {
  buildReportIntentHref,
  buildReportOrigin,
  applyReportStateChange,
  parseReportIntent,
  reportAuthorityModeForOperatingContext,
} from './reportIntent';

describe('report intent contract', () => {
  const learnerSubject = { type: 'learner-subject', learnerId: 22, cohortSubjectId: 3 } as const;

  it('defaults the canonical cohort-subject object to Overview', () => {
    expect(parseReportIntent({ type: 'cohort-subject', cohortSubjectId: 3 }, '').projection)
      .toBe('overview');
  });

  it('normalizes legacy learner assignment intent into canonical object, projection, period, and focus', () => {
    expect(parseReportIntent(
      learnerSubject,
      'tab=assignments&academic_year=8&term=4&highlightAssignment=14&returnTo=%2Fassignments%2F14',
    )).toMatchObject({
      object: learnerSubject,
      projection: 'assignments',
      period: { academicYearId: 8, termId: 4 },
      focus: { assignmentId: 14 },
      origin: { kind: 'intent', returnTo: '/assignments/14' },
    });
  });

  it('serializes complete canonical state without deriving scope from returnTo', () => {
    const href = buildReportIntentHref({
      object: learnerSubject,
      projection: 'attendance',
      period: { academicYearId: 8, termId: 4 },
      focus: { sessionId: 19 },
      table: { query: 'amina', status: 'absent', sort: '-date', page: 2, pageSize: 25 },
      authorityMode: 'supervision',
      origin: { kind: 'intent', returnTo: '/sessions/19?section=attendance' },
    });

    expect(href).toContain('/reports/learners/22/cohort-subjects/3?');
    expect(href).toContain('projection=attendance');
    expect(href).not.toContain('cohort_subject=3');
    expect(href).not.toContain('student=22');
    expect(href).toContain('academic_year=8');
    expect(href).toContain('term=4');
    expect(href).toContain('session=19');
    expect(href).toContain('authority_mode=supervision');
    expect(href).toContain('returnTo=%2Fsessions%2F19%3Fsection%3Dattendance');
  });

  it('rejects unsafe and encoded-external origins', () => {
    expect(parseReportIntent(learnerSubject, 'returnTo=https%3A%2F%2Fevil.example').origin).toBeUndefined();
    expect(parseReportIntent(learnerSubject, 'returnTo=%252F%252Fevil.example').origin).toBeUndefined();
    expect(parseReportIntent(learnerSubject, 'returnTo=%E0%A4%A').origin).toBeUndefined();
  });

  it('does not grow nested return chains when capturing a hierarchical parent', () => {
    expect(buildReportOrigin(
      '/reports/cohort-subjects/3',
      'projection=learners&term=4&q=amina&returnTo=%2Freports%2Fsubjects%2F7&origin=hierarchy',
    )).toBe('/reports/cohort-subjects/3?projection=learners&term=4&q=amina');
  });

  it('selects authority from the active operating context', () => {
    expect(reportAuthorityModeForOperatingContext('WORKSPACE_MANAGEMENT')).toBe('supervision');
    expect(reportAuthorityModeForOperatingContext('MY_TEACHING')).toBe('teaching');
  });

  it('clears dependency descendants while preserving stable parent state', () => {
    const original = 'academic_year=8&term=4&cohort=2&subject=7&cohort_subject=3&student=22&projection=assignments&assignment=14&q=amina&sort=name&page=2';
    const changedTerm = applyReportStateChange(original, 'term', 5);
    expect(changedTerm.get('projection')).toBe('assignments');
    expect(changedTerm.get('q')).toBe('amina');
    expect(changedTerm.get('assignment')).toBeNull();

    const changedSubject = applyReportStateChange(original, 'subject', 9);
    expect(changedSubject.get('cohort_subject')).toBeNull();
    expect(changedSubject.get('student')).toBeNull();
    expect(changedSubject.get('assignment')).toBeNull();

    const changedProjection = applyReportStateChange(original, 'projection', 'attendance');
    expect(changedProjection.get('term')).toBe('4');
    expect(changedProjection.get('cohort_subject')).toBe('3');
  });
});
