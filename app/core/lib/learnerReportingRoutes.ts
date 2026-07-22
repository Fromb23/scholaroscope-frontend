import {
  buildLearnerAssessmentReportHref as buildLearnerAssessmentReportHrefFromNavigation,
  buildLearnerAssignmentReportHref as buildLearnerAssignmentReportHrefFromNavigation,
  buildLearnerOverviewReportHref as buildLearnerOverviewReportHrefFromNavigation,
  buildLearnerSubjectReportHref as buildLearnerSubjectReportHrefFromNavigation,
} from '@/app/core/components/reports/reportNavigation';

export function buildLearnerAssessmentReportHref(
  learnerId: number,
  options?: {
    assessmentId?: number | null;
    cohortSubjectId?: number | null;
    assessmentType?: string | null;
    termId?: number | null;
    subjectId?: number | null;
    cohortId?: number | null;
    academicYearId?: number | null;
    returnTo?: string | null;
  },
): string {
  return buildLearnerAssessmentReportHrefFromNavigation(
    learnerId,
    {
      assessment: options?.assessmentId ?? null,
      cohortSubjectId: options?.cohortSubjectId ?? null,
      assessmentType: options?.assessmentType ?? null,
      term: options?.termId ?? null,
      subjectId: options?.subjectId ?? null,
      cohortId: options?.cohortId ?? null,
      academicYearId: options?.academicYearId ?? null,
      returnTo: options?.returnTo ?? null,
    },
  );
}

export function buildLearnerAssignmentReportHref(
  learnerId: number,
  options?: {
    cohortSubjectId?: number | null;
    highlightAssignment?: number | null;
    returnTo?: string | null;
  },
): string {
  return buildLearnerAssignmentReportHrefFromNavigation(
    learnerId,
    {
      cohortSubjectId: options?.cohortSubjectId ?? null,
      highlightAssignment: options?.highlightAssignment ?? null,
      returnTo: options?.returnTo ?? null,
    },
  );
}

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
