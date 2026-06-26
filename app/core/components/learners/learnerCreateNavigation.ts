import { isSafeNextPath } from '@/app/core/auth/navigation';

export interface LearnerCreateHrefParams {
  cohortId?: number | null;
  cohortSubjectId?: number | null;
  returnTo?: string | null;
}

export interface LearnerCreateReturnParams {
  returnTo?: string | null;
  cohortId?: number | null;
  isSelfManagedTeachingWorkspace?: boolean;
}

function isPositiveId(value?: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function buildClassReturnTo(cohortId: number): string {
  return `/academic/cohorts/${cohortId}`;
}

export function buildClassSubjectReturnTo(cohortId: number, cohortSubjectId: number): string {
  return `${buildClassReturnTo(cohortId)}#subject-${cohortSubjectId}`;
}

export function buildLearnerCreateHref({
  cohortId,
  cohortSubjectId,
  returnTo,
}: LearnerCreateHrefParams): string {
  const params = new URLSearchParams();

  if (isPositiveId(cohortId)) {
    params.set('cohort', String(cohortId));
  }

  if (isPositiveId(cohortSubjectId)) {
    params.set('cohort_subject', String(cohortSubjectId));
  }

  const resolvedReturnTo = isSafeNextPath(returnTo)
    ? returnTo
    : isPositiveId(cohortId) && isPositiveId(cohortSubjectId)
      ? buildClassSubjectReturnTo(cohortId, cohortSubjectId)
      : isPositiveId(cohortId)
        ? buildClassReturnTo(cohortId)
        : null;

  if (resolvedReturnTo) {
    params.set('returnTo', resolvedReturnTo);
  }

  const query = params.toString();
  return query ? `/learners/new?${query}` : '/learners/new';
}

export function getLearnerCreateReturnTo({
  returnTo,
  cohortId,
  isSelfManagedTeachingWorkspace = false,
}: LearnerCreateReturnParams): string | null {
  if (isSafeNextPath(returnTo)) {
    return returnTo;
  }

  if (isSelfManagedTeachingWorkspace && isPositiveId(cohortId)) {
    return buildClassReturnTo(cohortId);
  }

  return null;
}
