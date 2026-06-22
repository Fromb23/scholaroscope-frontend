import type { TeachingAssignment } from '@/app/core/types/academic';
import type { TeachingTodayContext, TeachingTodayIncompleteItem } from '@/app/core/hooks/useTeachingToday';
import type { Session } from '@/app/core/types/session';
import { buildAttendanceReportHref } from '@/app/core/components/reports/reportNavigation';

export const MIDTERM_DASHBOARD_RETURN_TO = '/dashboard/instructor?mode=midterm';

export interface MidtermInsight {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  href: string;
  kind: 'attendance' | 'sessions' | 'assignments' | 'schemes' | 'assessments';
  featured?: boolean;
}

function firstPositiveNumber(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return null;
}

function appendQuery(href: string, values: Record<string, string | number | null | undefined>): string {
  const [path, query = ''] = href.split('?');
  const params = new URLSearchParams(query);

  Object.entries(values).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  const nextQuery = params.toString();
  return nextQuery ? `${path}?${nextQuery}` : path;
}

export function buildMidtermReturnHref(href: string): string {
  return appendQuery(href, {
    source: 'midterm',
    returnTo: MIDTERM_DASHBOARD_RETURN_TO,
  });
}

export function getTeachingAssignmentCohortSubjectId(assignment: TeachingAssignment): number | null {
  return firstPositiveNumber(
    assignment.cohort_subject_id,
    assignment.cbc_cohort_subject_id,
    assignment.cambridge_cohort_subject_id,
    assignment.teaching_link_id,
  );
}

export function getSessionCohortSubjectId(session: Session): number | null {
  return firstPositiveNumber(session.cohort_subject, session.cambridge_cohort_subject_id);
}

function getPrimaryTeachingAssignment(context: TeachingTodayContext): TeachingAssignment | null {
  return context.teachingLoad.find((assignment) => getTeachingAssignmentCohortSubjectId(assignment))
    ?? context.teachingLoad[0]
    ?? null;
}

function getPendingSessionItems(context: TeachingTodayContext): TeachingTodayIncompleteItem[] {
  return context.incomplete.filter((item) => (
    item.session.status === 'IN_PROGRESS'
    || Boolean(item.session.needs_completion)
    || item.session.schedule_state === 'IN_PROGRESS_OVERDUE'
  ));
}

export function buildPendingLessonCleanupHref(
  context: TeachingTodayContext,
  options?: {
    sessions?: Session[];
    cohortSubjectId?: number | null;
  },
): string {
  const sessions = options?.sessions ?? getPendingSessionItems(context).map((item) => item.session);
  const ids = sessions.map((session) => session.id).filter((id) => Number.isFinite(id));
  const cohortSubjectId = options?.cohortSubjectId
    ?? sessions.map(getSessionCohortSubjectId).find((id): id is number => Boolean(id))
    ?? null;

  return appendQuery('/sessions', {
    filter: 'pending_cleanup',
    status: 'needs_completion',
    source: 'midterm',
    ids: ids.length > 0 ? ids.join(',') : null,
    cohort_subject: cohortSubjectId,
    returnTo: MIDTERM_DASHBOARD_RETURN_TO,
  });
}

export function buildPendingLessonItemHref(item: TeachingTodayIncompleteItem): string {
  return buildMidtermReturnHref(item.actionHref);
}

export function buildAssignmentReviewHref(context: TeachingTodayContext): string | null {
  const pendingSessionAssignment = getPendingSessionItems(context)
    .map((item) => ({
      cohortId: item.session.cohort_id,
      cohortSubjectId: getSessionCohortSubjectId(item.session),
    }))
    .find((item) => item.cohortId && item.cohortSubjectId);

  if (pendingSessionAssignment) {
    return appendQuery(`/academic/cohorts/${pendingSessionAssignment.cohortId}/assignments`, {
      cohort_subject: pendingSessionAssignment.cohortSubjectId,
      review: 'needs_review',
      source: 'midterm',
      returnTo: MIDTERM_DASHBOARD_RETURN_TO,
    });
  }

  const assignment = getPrimaryTeachingAssignment(context);
  if (!assignment?.cohort_id) {
    return null;
  }

  return appendQuery(`/academic/cohorts/${assignment.cohort_id}/assignments`, {
    cohort_subject: getTeachingAssignmentCohortSubjectId(assignment),
    review: 'needs_review',
    source: 'midterm',
    returnTo: MIDTERM_DASHBOARD_RETURN_TO,
  });
}

export function buildMidtermSchemesHref(context: TeachingTodayContext): string {
  const assignment = getPrimaryTeachingAssignment(context);

  return appendQuery('/schemes', {
    cohort: assignment?.cohort_id,
    subject: assignment?.subject_id,
    source: 'midterm',
    returnTo: MIDTERM_DASHBOARD_RETURN_TO,
  });
}

export function buildMidtermInsightsHref(): string {
  return appendQuery('/reports/intelligence', {
    source: 'midterm',
    returnTo: MIDTERM_DASHBOARD_RETURN_TO,
  });
}

export function deriveMidtermInsights(context: TeachingTodayContext, limit = 4): MidtermInsight[] {
  const insights: MidtermInsight[] = [];
  const pendingSessionItems = getPendingSessionItems(context);
  const firstAssignment = getPrimaryTeachingAssignment(context);
  const firstPendingReviewRow = context.afterTeaching.pendingReviewRows[0] ?? null;

  if (firstPendingReviewRow && context.currentTerm?.id && firstAssignment?.subject_id) {
    insights.push({
      id: `attendance-${firstPendingReviewRow.student}`,
      title: `${firstPendingReviewRow.student_name} may need a closer look before learning resumes.`,
      body: `Open the current term attendance pattern alongside ${firstAssignment.subject_name}.`,
      actionLabel: 'View attendance pattern',
      href: buildAttendanceReportHref({
        student: firstPendingReviewRow.student,
        subject: firstAssignment.subject_id,
        term: context.currentTerm.id,
        returnTo: MIDTERM_DASHBOARD_RETURN_TO,
      }),
      kind: 'attendance',
      featured: true,
    });
  }

  if (pendingSessionItems.length > 0) {
    const firstSession = pendingSessionItems[0].session;
    const subjectLabel = firstSession
      ? `${firstSession.cohort_name} ${firstSession.subject_name}`
      : 'Your lesson records';

    insights.push({
      id: 'pending-session-records',
      title: `${subjectLabel} has ${pendingSessionItems.length} lesson record${pendingSessionItems.length === 1 ? '' : 's'} ready for reflection.`,
      body: 'This can wait until you have a quiet moment.',
      actionLabel: 'Finish records',
      href: buildPendingLessonCleanupHref(context, {
        sessions: pendingSessionItems.map((item) => item.session),
        cohortSubjectId: firstSession ? getSessionCohortSubjectId(firstSession) : null,
      }),
      kind: 'sessions',
    });
  }

  const assignmentHref = buildAssignmentReviewHref(context);
  if (assignmentHref && firstAssignment) {
    insights.push({
      id: 'assignment-review-workspace',
      title: `${firstAssignment.subject_name} assignments are ready to review when useful.`,
      body: `${firstAssignment.cohort_name} opens directly in the class subject assignment workspace.`,
      actionLabel: 'Review responses',
      href: assignmentHref,
      kind: 'assignments',
    });
  }

  if (context.afterTeaching.pendingAssessmentReviewCount > 0) {
    const row = firstPendingReviewRow;
    insights.push({
      id: 'assessment-review',
      title: `${context.afterTeaching.pendingAssessmentReviewCount} assessment record${context.afterTeaching.pendingAssessmentReviewCount === 1 ? '' : 's'} are ready for review.`,
      body: row ? `${row.assessment_name} can be opened from the learner row.` : 'Assessment review remains available during the break.',
      actionLabel: row ? 'Review learner row' : 'Open assessments',
      href: row
        ? buildMidtermReturnHref(`/assessments/${row.assessment}?focus=score-entry&student=${row.student}`)
        : buildMidtermReturnHref('/assessments?status=pending'),
      kind: 'assessments',
    });
  }

  if (firstAssignment && context.currentWeek) {
    insights.push({
      id: 'scheme-rebalance',
      title: `Week ${context.currentWeek} can be checked before learning resumes.`,
      body: `Open ${firstAssignment.cohort_name} ${firstAssignment.subject_name} schemes if you want to adjust the next teaching week.`,
      actionLabel: 'Open schemes',
      href: buildMidtermSchemesHref(context),
      kind: 'schemes',
    });
  }

  const unique = new Map<string, MidtermInsight>();
  insights.forEach((insight) => {
    if (!unique.has(insight.id)) {
      unique.set(insight.id, insight);
    }
  });

  return Array.from(unique.values()).slice(0, limit);
}
