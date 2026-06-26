import { describe, expect, it } from 'vitest';

import {
  buildClassLearnerProfileHref,
  buildClassSubjectLearnerProfileHref,
  buildLearnerProfileHref,
  getLearnerProfileBackTarget,
} from './learnerProfileNavigation';

describe('learner profile navigation', () => {
  it('returns to a class when returnTo points at a cohort', () => {
    expect(getLearnerProfileBackTarget({
      returnTo: '/academic/cohorts/9',
      isSelfManagedTeachingWorkspace: true,
    })).toEqual({
      href: '/academic/cohorts/9',
      label: 'Back to class',
    });
  });

  it('returns to a class subject when returnTo carries a subject anchor', () => {
    expect(getLearnerProfileBackTarget({
      returnTo: '/academic/cohorts/9#subject-26',
      isSelfManagedTeachingWorkspace: true,
    })).toEqual({
      href: '/academic/cohorts/9#subject-26',
      label: 'Back to class subject',
    });
  });

  it('keeps global learner registry return labels for learner registry contexts', () => {
    expect(getLearnerProfileBackTarget({
      returnTo: '/learners',
      isSelfManagedTeachingWorkspace: true,
    })).toEqual({
      href: '/learners',
      label: 'Back to Learners',
    });
  });

  it('ignores unsafe external returnTo values', () => {
    expect(getLearnerProfileBackTarget({
      returnTo: 'https://example.com/learners',
      isSelfManagedTeachingWorkspace: true,
    })).toEqual({
      href: '/academic/cohorts',
      label: 'Back to classes',
    });
  });

  it('falls back to classes for self-managed teaching workspaces without returnTo', () => {
    expect(getLearnerProfileBackTarget({
      isSelfManagedTeachingWorkspace: true,
    })).toEqual({
      href: '/academic/cohorts',
      label: 'Back to classes',
    });
  });

  it('falls back to learners for institution/admin workspaces without returnTo', () => {
    expect(getLearnerProfileBackTarget({
      isSelfManagedTeachingWorkspace: false,
    })).toEqual({
      href: '/learners',
      label: 'Back to Learners',
    });
  });

  it('preserves legacy learner registry back filters', () => {
    expect(getLearnerProfileBackTarget({
      back: 'cohort=9&page=2',
      isSelfManagedTeachingWorkspace: true,
    })).toEqual({
      href: '/learners?cohort=9&page=2',
      label: 'Back to Learners',
    });
  });

  it('builds class learner profile links with encoded class return context', () => {
    expect(buildClassLearnerProfileHref(12, 9)).toBe(
      '/learners/12?returnTo=%2Facademic%2Fcohorts%2F9',
    );
  });

  it('builds subject learner profile links with encoded class subject return context', () => {
    expect(buildClassSubjectLearnerProfileHref(12, 9, 26)).toBe(
      '/learners/12?returnTo=%2Facademic%2Fcohorts%2F9%23subject-26',
    );
  });

  it('can build global learner profile links with learner registry return context', () => {
    expect(buildLearnerProfileHref(12, '/learners')).toBe(
      '/learners/12?returnTo=%2Flearners',
    );
  });
});
