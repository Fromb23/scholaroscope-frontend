export function buildLearnerSubjectReportHref(
  learnerId: number,
  cohortSubjectId?: number | null,
): string {
  const params = new URLSearchParams();
  if (cohortSubjectId) {
    params.set('cohort_subject', String(cohortSubjectId));
  }
  const query = params.toString();
  return query
    ? `/reports/learners/${learnerId}/subject?${query}`
    : `/reports/learners/${learnerId}/subject`;
}

export function buildLearnerOverviewReportHref(learnerId: number): string {
  return `/reports/learners/${learnerId}/overview`;
}
