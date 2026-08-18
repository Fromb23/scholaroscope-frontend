import {
  buildLearnerAssessmentReportHref as buildLearnerAssessmentReportHrefFromNavigation,
  buildLearnerAssignmentReportHref as buildLearnerAssignmentReportHrefFromNavigation,
  buildLearnerOverviewReportHref as buildLearnerOverviewReportHrefFromNavigation,
  buildLearnerSubjectReportHref as buildLearnerSubjectReportHrefFromNavigation,
  buildCanonicalLearnerSubjectReportHref,
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
    authorityMode?: 'teaching' | 'supervision' | null;
    returnTo?: string | null;
  },
): string {
  if (options?.cohortSubjectId) {
    return buildCanonicalLearnerSubjectReportHref(
      learnerId,
      options.cohortSubjectId,
      'assessments-results',
      {
        assessment: options.assessmentId,
        term: options.termId,
        academicYearId: options.academicYearId,
        subjectId: options.subjectId,
        cohortId: options.cohortId,
        authorityMode: options.authorityMode,
        returnTo: options.returnTo,
        originKind: 'intent',
      },
    );
  }
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
    termId?: number | null;
    academicYearId?: number | null;
    authorityMode?: 'teaching' | 'supervision' | null;
    returnTo?: string | null;
  },
): string {
  if (options?.cohortSubjectId) {
    return buildCanonicalLearnerSubjectReportHref(
      learnerId,
      options.cohortSubjectId,
      'assignments',
      {
        assignment: options.highlightAssignment,
        term: options.termId,
        academicYearId: options.academicYearId,
        authorityMode: options.authorityMode,
        returnTo: options.returnTo,
        originKind: 'intent',
      },
    );
  }
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
    projection?: 'overview' | 'attendance' | 'assessments-results' | 'assignments' | 'curriculum-progress' | null;
    termId?: number | null;
    academicYearId?: number | null;
    authorityMode?: 'teaching' | 'supervision' | null;
    highlightAssignment?: number | null;
    returnTo?: string | null;
  },
): string {
  if (cohortSubjectId) {
    return buildCanonicalLearnerSubjectReportHref(
      learnerId,
      cohortSubjectId,
      options?.projection ?? 'overview',
      {
        term: options?.termId,
        academicYearId: options?.academicYearId,
        authorityMode: options?.authorityMode,
        highlightAssignment: options?.highlightAssignment,
        returnTo: options?.returnTo,
        originKind: 'hierarchy',
      },
    );
  }
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
