import { parseAppDestination } from '@/app/core/auth/navigation';

function withReturnTo(pathname: string, returnTo?: string | null): string {
  const safeReturnTo = parseAppDestination(returnTo);
  if (!safeReturnTo) return pathname;
  const params = new URLSearchParams({ returnTo: safeReturnTo });
  return `${pathname}?${params.toString()}`;
}

export function buildAssessmentDetailHref(assessmentId: number, returnTo?: string | null): string {
  return withReturnTo(`/assessments/${assessmentId}`, returnTo);
}

export function buildAssignmentDetailHref(
  cohortId: number,
  assignmentId: number,
  returnTo?: string | null,
): string {
  return withReturnTo(`/academic/cohorts/${cohortId}/assignments/${assignmentId}`, returnTo);
}

export function resolveOperationalDetailBack(options: {
  returnTo?: string | null;
  hierarchicalParent?: string | null;
  structuralFallback: string;
}): string {
  return (
    parseAppDestination(options.returnTo) ??
    parseAppDestination(options.hierarchicalParent) ??
    options.structuralFallback
  );
}

export function getOperationalDetailBackLabel(destination: string): string {
  const safe = parseAppDestination(destination);
  if (!safe) return 'Back';
  if (/^\/reports\/(?:instructor\/)?cohort-subjects\/\d+/.test(safe)) {
    if (safe.includes('projection=assessments-results')) return 'Back to Assessments & Results';
    if (safe.includes('projection=assignments')) return 'Back to Assignments';
    return 'Back to Class Subject Report';
  }
  if (/^\/academic\/cohorts\/\d+\/assignments\/\d+/.test(safe)) {
    return 'Back to Assignment';
  }
  if (/^\/academic\/cohorts\/\d+\/assignments/.test(safe)) {
    return 'Back to Assignments';
  }
  if (/^\/lesson-plans\//.test(safe)) return 'Back to Lesson Preparation';
  if (/^\/sessions\//.test(safe)) return 'Back to Lesson';
  if (/^\/assessments(?:[/?#]|$)/.test(safe)) return 'Back to Assessments';
  return 'Back';
}
