import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  filterByTeachingProjection,
  shouldApplyTeachingProjection,
} from '@/app/core/lib/teachingProjectionBoundary';
import { getAvailableCohortSubjectOfferings } from '@/app/core/lib/cohortSubjectCompatibility';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('cohort management projection boundary', () => {
  it('does not narrow managed cohort lists just because the actor can teach', () => {
    const hookSource = source('app/core/hooks/useAcademic.ts');
    const accessSource = source('app/core/hooks/useInstructorCohortAccess.ts');

    expect(accessSource).toContain('hasManagementProjection');
    expect(hookSource).toContain('cohortTeachingProjectionBoundary');
    expect(hookSource).toContain('filterByTeachingProjection(allCohorts, allowedCohortIds, cohortTeachingProjectionBoundary)');
  });

  it('keeps the secondary cohort hook on the same management-aware projection boundary', () => {
    const hookSource = source('app/core/hooks/useCohorts.ts');

    expect(hookSource).toContain('cohortTeachingProjectionBoundary');
    expect(hookSource).toContain('filterByTeachingProjection(allCohorts, allowedCohortIds, cohortTeachingProjectionBoundary)');
    expect(hookSource).not.toContain('instructorAccess.hasTeachingProjection\n          ? allCohorts.filter');
  });

  it('retains workspace subjects for a freelance actor who can teach and manage setup', () => {
    const grade9Mathematics = { id: 9, name: 'Mathematics', level: 'Grade 9' };
    const grade8Science = { id: 8, name: 'Science', level: 'Grade 8' };
    const allowedTeachingSubjectIds = new Set([grade8Science.id]);

    const visibleSubjects = filterByTeachingProjection(
      [grade9Mathematics, grade8Science],
      allowedTeachingSubjectIds,
      { hasTeachingProjection: true, hasManagementProjection: true },
    );

    expect(shouldApplyTeachingProjection({
      hasTeachingProjection: true,
      hasManagementProjection: true,
    })).toBe(false);
    expect(visibleSubjects).toContain(grade9Mathematics);
    expect(visibleSubjects).toEqual([grade9Mathematics, grade8Science]);
  });

  it('continues to restrict subject lists for teaching-only institution teachers', () => {
    const grade9Mathematics = { id: 9, name: 'Mathematics', level: 'Grade 9' };
    const grade8Science = { id: 8, name: 'Science', level: 'Grade 8' };

    const visibleSubjects = filterByTeachingProjection(
      [grade9Mathematics, grade8Science],
      new Set([grade8Science.id]),
      { hasTeachingProjection: true, hasManagementProjection: false },
    );

    expect(shouldApplyTeachingProjection({
      hasTeachingProjection: true,
      hasManagementProjection: false,
    })).toBe(true);
    expect(visibleSubjects).toEqual([grade8Science]);
  });

  it('routes useSubjects through the same management-aware teaching projection boundary', () => {
    const hookSource = source('app/core/hooks/useAcademic.ts');

    expect(hookSource).toContain('subjectTeachingProjectionBoundary');
    expect(hookSource).toContain('filterByTeachingProjection(allSubjects, allowedSubjectIds, subjectTeachingProjectionBoundary)');
    expect(hookSource).not.toContain('instructorAccess.hasTeachingProjection\n          ? allSubjects.filter');
  });

  it('keeps Grade 9 Mathematics available to link after subject projection retains it', () => {
    const grade9Mathematics = { id: 9, name: 'Mathematics', level: 'Grade 9' };
    const incompatiblePp1Language = { id: 1, name: 'Language Activities', level: 'PP1' };

    const visibleSubjects = filterByTeachingProjection(
      [grade9Mathematics, incompatiblePp1Language],
      new Set<number>(),
      { hasTeachingProjection: true, hasManagementProjection: true },
    );

    const availableToLink = getAvailableCohortSubjectOfferings(
      visibleSubjects,
      new Set<number>(),
      'Grade 9',
    );

    expect(availableToLink).toEqual([grade9Mathematics]);
    expect(availableToLink).not.toContain(incompatiblePp1Language);
  });

  it('does not offer already linked or incompatible subjects for cohort linking', () => {
    const linkedGrade9Mathematics = { id: 9, name: 'Mathematics', level: 'Grade 9' };
    const unlinkedGrade9Science = { id: 10, name: 'Integrated Science', level: 'grade9' };
    const incompatiblePp1Language = { id: 1, name: 'Language Activities', level: 'PP1' };

    const availableToLink = getAvailableCohortSubjectOfferings(
      [linkedGrade9Mathematics, unlinkedGrade9Science, incompatiblePp1Language],
      new Set([linkedGrade9Mathematics.id]),
      'Grade 9',
    );

    expect(availableToLink).toEqual([unlinkedGrade9Science]);
  });
});
