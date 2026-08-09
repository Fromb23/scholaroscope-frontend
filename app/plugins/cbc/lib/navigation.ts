import { isSafeNextPath } from '@/app/core/auth/navigation';

type SearchParamsLike = URLSearchParams | { toString(): string } | string | null | undefined;

function toUrlSearchParams(searchParams: SearchParamsLike): URLSearchParams {
  if (!searchParams) {
    return new URLSearchParams();
  }

  if (typeof searchParams === 'string') {
    return new URLSearchParams(searchParams.startsWith('?') ? searchParams.slice(1) : searchParams);
  }

  return new URLSearchParams(searchParams.toString());
}

export function sanitizeInternalReturnTo(returnTo: string | null | undefined): string | null {
  return isSafeNextPath(returnTo) ? returnTo : null;
}

export function buildCbcPath(
  pathname: string,
  params?: {
    cohort?: number | string | null;
    subject?: number | string | null;
    cohortSubjectId?: number | string | null;
    cbcCohortSubjectId?: number | string | null;
    instructorId?: number | string | null;
    authorityMode?: 'teaching' | 'supervision' | null;
    returnTo?: string | null;
  },
): string {
  const searchParams = new URLSearchParams();

  if (params?.cohort) {
    searchParams.set('cohort', String(params.cohort));
  }
  if (params?.subject) {
    searchParams.set('subject', String(params.subject));
  }
  if (params?.cohortSubjectId) {
    searchParams.set('cohort_subject_id', String(params.cohortSubjectId));
  }
  if (params?.cbcCohortSubjectId) {
    searchParams.set('cbc_cohort_subject_id', String(params.cbcCohortSubjectId));
  }
  if (params?.instructorId) {
    searchParams.set('instructor_id', String(params.instructorId));
  }
  if (params?.authorityMode) {
    searchParams.set('authority_mode', params.authorityMode);
  }

  const safeReturnTo = sanitizeInternalReturnTo(params?.returnTo);
  if (safeReturnTo) {
    searchParams.set('returnTo', safeReturnTo);
  }

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildCurrentCbcWorkspaceHref(
  pathname: string,
  searchParams: SearchParamsLike,
): string {
  const nextSearchParams = toUrlSearchParams(searchParams);
  const safeReturnTo = sanitizeInternalReturnTo(nextSearchParams.get('returnTo'));

  if (safeReturnTo) {
    nextSearchParams.set('returnTo', safeReturnTo);
  } else {
    nextSearchParams.delete('returnTo');
  }

  const query = nextSearchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function updateCbcUrlFilter(
  searchParams: SearchParamsLike,
  key: 'subject' | 'cohort',
  value: number | null,
): URLSearchParams {
  const next = toUrlSearchParams(searchParams);
  const returnTo = sanitizeInternalReturnTo(next.get('returnTo'));
  if (value === null) next.delete(key);
  else next.set(key, String(value));
  if (returnTo) next.set('returnTo', returnTo);
  else next.delete('returnTo');
  return next;
}

export function getCbcBackLabel(
  returnTo: string | null | undefined,
  fallbackLabel = 'Back',
): string {
  const safeReturnTo = sanitizeInternalReturnTo(returnTo);
  if (!safeReturnTo) {
    return fallbackLabel;
  }

  if (/^\/academic\/cohorts\/\d+\/assignments(?:\/|$|\?)/.test(safeReturnTo)) {
    return 'Back to Assignments';
  }
  if (safeReturnTo.startsWith('/academic/cohorts/')) {
    return 'Back to Cohort';
  }
  if (safeReturnTo.startsWith('/cbc/browser')) {
    return 'Back to CBC Subjects & Outcomes';
  }
  if (safeReturnTo.startsWith('/cbc/progress')) {
    return 'Back to CBC Progress';
  }
  if (safeReturnTo.startsWith('/admin/instructors/')) {
    return 'Back to Instructor Progress';
  }

  return fallbackLabel;
}
