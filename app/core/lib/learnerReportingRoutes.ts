export function buildLearnerSubjectReportHref(
  learnerId: number,
  cohortSubjectId?: number | null,
  options?: {
    returnTo?: string | null;
  },
): string {
  const params = new URLSearchParams();
  if (cohortSubjectId) {
    params.set('cohort_subject', String(cohortSubjectId));
  }
  if (options?.returnTo) {
    params.set('returnTo', options.returnTo);
  }
  const query = params.toString();
  return query
    ? `/reports/learners/${learnerId}/subject?${query}`
    : `/reports/learners/${learnerId}/subject`;
}

export function buildLearnerOverviewReportHref(
  learnerId: number,
  options?: {
    returnTo?: string | null;
  },
): string {
  const params = new URLSearchParams();
  if (options?.returnTo) {
    params.set('returnTo', options.returnTo);
  }
  const query = params.toString();
  return query
    ? `/reports/learners/${learnerId}/overview?${query}`
    : `/reports/learners/${learnerId}/overview`;
}
