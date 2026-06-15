import {
  buildLearnerOverviewReportHref as buildLearnerOverviewReportHrefFromNavigation,
  buildLearnerSubjectReportHref as buildLearnerSubjectReportHrefFromNavigation,
} from '@/app/core/components/reports/reportNavigation';

export function buildLearnerSubjectReportHref(
  learnerId: number,
  cohortSubjectId?: number | null,
  options?: {
    returnTo?: string | null;
  },
): string {
  return buildLearnerSubjectReportHrefFromNavigation(
    learnerId,
    cohortSubjectId,
    { returnTo: options?.returnTo ?? null },
  );
}

export function buildLearnerOverviewReportHref(
  learnerId: number,
  options?: {
    returnTo?: string | null;
  },
): string {
  return buildLearnerOverviewReportHrefFromNavigation(
    learnerId,
    { returnTo: options?.returnTo ?? null },
  );
}
