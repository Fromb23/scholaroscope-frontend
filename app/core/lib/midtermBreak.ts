import type { TeachingAssignment } from '@/app/core/types/academic';
import type { TeachingTodayContext, TeachingTodayIncompleteItem } from '@/app/core/hooks/useTeachingToday';
import type { Session } from '@/app/core/types/session';

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

export function getPendingSessionItems(context: TeachingTodayContext): TeachingTodayIncompleteItem[] {
  return context.incomplete.filter((item) => (
    item.session.status === 'IN_PROGRESS'
    || Boolean(item.session.needs_completion)
    || item.session.schedule_state === 'IN_PROGRESS_OVERDUE'
  ));
}

export function getPendingAssignmentReviewItems(context: TeachingTodayContext) {
  return context.afterTeaching.assignmentWork.filter((item) => (
    item.lifecycle_stage !== 'STORED'
    && item.next_action !== 'NONE'
    && (
      item.next_action === 'REVIEW_WORK'
      || item.counts.pending_reviews > 0
    )
    && item.next_action_href.trim().length > 0
  ));
}

export function getPendingAssessmentReviewItems(context: TeachingTodayContext) {
  return context.afterTeaching.pendingAssessments.filter((item) => (
    typeof item.assessment_id === 'number'
    && Number.isFinite(item.assessment_id)
    && item.assessment_id > 0
    && item.pending_learner_count > 0
  ));
}

export function buildPendingLessonCleanupHref(
  context: TeachingTodayContext,
  options?: {
    sessions?: Session[];
    cohortSubjectId?: number | null;
  },
): string | null {
  const sessions = options?.sessions ?? getPendingSessionItems(context).map((item) => item.session);
  const ids = sessions.map((session) => session.id).filter((id) => Number.isFinite(id));
  if (ids.length === 0) {
    return null;
  }

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
  const assignment = getPendingAssignmentReviewItems(context)[0] ?? null;
  return assignment ? buildMidtermReturnHref(assignment.next_action_href) : null;
}

export function buildPendingAssessmentReviewHref(context: TeachingTodayContext): string | null {
  const assessment = getPendingAssessmentReviewItems(context)[0] ?? null;
  if (!assessment) {
    return null;
  }

  return buildMidtermReturnHref(`/assessments/${assessment.assessment_id}?focus=score-entry`);
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

export function buildMidtermTeacherReportsHref(teacherId: number | null | undefined): string {
  if (teacherId) {
    return appendQuery(`/admin/instructors/${teacherId}/progress`, {
      source: 'midterm',
      returnTo: MIDTERM_DASHBOARD_RETURN_TO,
    });
  }

  return appendQuery('/reports/instructor', {
    source: 'midterm',
    returnTo: MIDTERM_DASHBOARD_RETURN_TO,
  });
}

export function deriveMidtermInsights(context: TeachingTodayContext, limit = 4): MidtermInsight[] {
  const insights: MidtermInsight[] = [];
  const pendingSessionItems = getPendingSessionItems(context);
  const firstAssignment = getPendingAssignmentReviewItems(context)[0] ?? null;
  const firstPendingAssessment = getPendingAssessmentReviewItems(context)[0] ?? null;

  if (firstPendingAssessment) {
    insights.push({
      id: `assessment-${firstPendingAssessment.assessment_id}`,
      title: `${firstPendingAssessment.assessment_name} has learner records pending.`,
      body: `${firstPendingAssessment.pending_learner_count} learner record${firstPendingAssessment.pending_learner_count === 1 ? '' : 's'} need review for ${firstPendingAssessment.subject_name}.`,
      actionLabel: 'Open assessment records',
      href: appendQuery(`/assessments/${firstPendingAssessment.assessment_id}`, {
        focus: 'score-entry',
        source: 'midterm',
        returnTo: MIDTERM_DASHBOARD_RETURN_TO,
      }),
      kind: 'assessments',
      featured: true,
    });
  }

  if (pendingSessionItems.length > 0) {
    const firstSession = pendingSessionItems[0].session;
    const href = buildPendingLessonCleanupHref(context, {
      sessions: pendingSessionItems.map((item) => item.session),
      cohortSubjectId: firstSession ? getSessionCohortSubjectId(firstSession) : null,
    });
    if (href) {
      const subjectLabel = firstSession
        ? `${firstSession.cohort_name} ${firstSession.subject_name}`
        : 'Your lesson records';

      insights.push({
        id: 'pending-session-records',
        title: `${subjectLabel} has ${pendingSessionItems.length} lesson record${pendingSessionItems.length === 1 ? '' : 's'} ready for reflection.`,
        body: 'This can wait until you have a quiet moment.',
        actionLabel: 'Finish records',
        href,
        kind: 'sessions',
      });
    }
  }

  const assignmentHref = buildAssignmentReviewHref(context);
  if (assignmentHref && firstAssignment) {
    insights.push({
      id: 'assignment-review-workspace',
      title: `${firstAssignment.subject.name} assignments are ready to review when useful.`,
      body: `${firstAssignment.cohort.name} opens directly in the assignment review workspace.`,
      actionLabel: 'Review responses',
      href: assignmentHref,
      kind: 'assignments',
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
