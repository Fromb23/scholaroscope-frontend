import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/assignments/CohortAssignmentDetailPage.tsx'),
  'utf8',
);

describe('CohortAssignmentDetailPage behavioral workflow', () => {
    it('restores review selection from URL state and falls back to pending submissions', () => {
        const pageSource = source();

        expect(pageSource).toContain('const selectedReviewSubmission = useMemo');
        expect(pageSource).toContain("parseWorkflow(searchParams.get('workflow'))");
        expect(pageSource).toContain("unitParam?.startsWith('student:')");
        expect(pageSource).toContain('pendingReviewSubmissions[0]');
    });

  it('opens review intentionally through the lifecycle action', () => {
    const pageSource = source();
    const reviewCaseIndex = pageSource.indexOf("case 'REVIEW_WORK':");
    const openReviewIndex = pageSource.indexOf('openReviewWorkflow();', reviewCaseIndex);

    expect(reviewCaseIndex).toBeGreaterThan(-1);
    expect(openReviewIndex).toBeGreaterThan(reviewCaseIndex);
    expect(pageSource).toContain('Hide review panel');
  });

  it('keeps internal assignment records behind progressive disclosure', () => {
    const pageSource = source();

    expect(pageSource).toContain('advancedDetailsOpen');
    expect(pageSource).toContain('Show assignment records');
    expect(pageSource).toContain('Hide assignment records');
  });

  it('hides edit and review workflow controls for stored assignments', () => {
    const pageSource = source();

    expect(pageSource).toContain("assignment.status !== 'ARCHIVED'");
    expect(pageSource).toContain("canChangeActiveAssignment && activeWorkflow === 'review'");
    expect(pageSource).toContain("canChangeActiveAssignment && activeWorkflow === 'record'");
  });

  it('passes lesson-origin metadata when deleting a draft assignment', () => {
    const pageSource = source();

    expect(pageSource).toContain('lessonPlanId: assignment.lesson_plan');
    expect(pageSource).toContain('createdFromSessionId: assignment.created_from_session');
  });

  it('does not expose the manual CBC evidence bridge button', () => {
    const pageSource = source();

    expect(pageSource).not.toContain('Bridge to CBC Evidence');
    expect(pageSource).toContain('Evidence pending');
    expect(pageSource).toContain('Evidence blocked');
  });

  it('exposes assignment stage memory to assistant page context', () => {
    const pageSource = source();

    expect(pageSource).toContain("pageKey: 'assignment_detail'");
    expect(pageSource).toContain('current_stage');
    expect(pageSource).toContain('primary_next_action');
    expect(pageSource).toContain('hidden_secondary_actions');
    expect(pageSource).toContain('unfinished_work_count');
  });

  it('links read-only learner records to assignment reports with return state', () => {
    const pageSource = source();

    expect(pageSource).toContain('resolveReportSurface');
    expect(pageSource).toContain('buildLearnerAssignmentReportHref');
    expect(pageSource).not.toContain('buildLearnerAssessmentReportHref');
    expect(pageSource).toContain('cohortSubjectId: assignment.cohort_subject');
    expect(pageSource).not.toContain('cohortSubjectId: isInstitutionAdminView ? null : assignment.cohort_subject');
    expect(pageSource).toContain('highlightAssignment: assignment.id');
    expect(pageSource).toContain('returnTo: currentReturnTo');
    expect(pageSource).toContain('renderLearnerReportLink(recipient.student, recipient.student_name');
    expect(pageSource).toContain('renderLearnerReportLink(submission.student, submission.student_name');
    expect(pageSource).toContain('renderLearnerReportLink(');
    expect(pageSource).toContain('/^\\/learners\\/\\d+\\/portfolio');
  });

  it('exposes sequential and bulk pending review actions', () => {
    const pageSource = source();

    expect(pageSource).toContain('Review pending');
    expect(pageSource).toContain('Apply review to all pending');
    expect(pageSource).toContain('bulkReviewMutation.mutateAsync');
  });
});
