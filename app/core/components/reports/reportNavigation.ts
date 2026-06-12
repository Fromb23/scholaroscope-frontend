export function parsePositiveReportParam(value: string | null): number | null {
  if (!value) return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function appendReportParams(
  href: string,
  options?: {
    termId?: number | null;
    cohortId?: number | null;
    returnTo?: string | null;
  },
): string {
  const params = new URLSearchParams();

  if (options?.termId && Number.isInteger(options.termId) && options.termId > 0) {
    params.set('term', String(options.termId));
  }

  if (options?.cohortId && Number.isInteger(options.cohortId) && options.cohortId > 0) {
    params.set('cohort_id', String(options.cohortId));
  }

  if (options?.returnTo) {
    params.set('returnTo', options.returnTo);
  }

  const queryString = params.toString();
  return queryString ? `${href}?${queryString}` : href;
}

export function buildInstructorCohortSubjectDetailHref(
  cohortSubjectId: number,
  termId?: number | null,
): string {
  return appendReportParams(`/reports/instructor/cohort-subjects/${cohortSubjectId}`, { termId });
}

export function buildInstructorClassReportHref(
  cohortSubjectId: number,
  termId?: number | null,
  options?: {
    cohortId?: number | null;
    returnTo?: string | null;
  },
): string {
  return appendReportParams(
    `/reports/instructor/cohort-subjects/${cohortSubjectId}/class-report`,
    {
      termId,
      cohortId: options?.cohortId,
      returnTo: options?.returnTo,
    },
  );
}
