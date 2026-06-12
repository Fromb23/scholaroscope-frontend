export function parsePositiveReportParam(value: string | null): number | null {
  if (!value) return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function appendTermParam(href: string, termId?: number | null): string {
  if (!termId || !Number.isInteger(termId) || termId <= 0) {
    return href;
  }

  const params = new URLSearchParams();
  params.set('term', String(termId));
  return `${href}?${params.toString()}`;
}

export function buildInstructorCohortSubjectDetailHref(
  cohortSubjectId: number,
  termId?: number | null,
): string {
  return appendTermParam(`/reports/instructor/cohort-subjects/${cohortSubjectId}`, termId);
}

export function buildInstructorClassReportHref(
  cohortSubjectId: number,
  termId?: number | null,
): string {
  return appendTermParam(`/reports/instructor/cohort-subjects/${cohortSubjectId}/class-report`, termId);
}
