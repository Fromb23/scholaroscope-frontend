import { normalizeAcademicLevel } from '@/app/core/lib/curriculumLevels';

export interface SubjectOfferingLevel {
  id: number;
  level?: string | null;
}

export function isSubjectOfferingCompatibleWithCohortLevel(
  cohortLevel: string | null | undefined,
  subjectLevel: string | null | undefined,
): boolean {
  return normalizeAcademicLevel(cohortLevel) === normalizeAcademicLevel(subjectLevel);
}

export function getAvailableCohortSubjectOfferings<T extends SubjectOfferingLevel>(
  allSubjects: T[],
  linkedSubjectIds: ReadonlySet<number>,
  cohortLevel: string | null | undefined,
): T[] {
  return allSubjects.filter((subject) => (
    !linkedSubjectIds.has(subject.id)
    && isSubjectOfferingCompatibleWithCohortLevel(cohortLevel, subject.level)
  ));
}
