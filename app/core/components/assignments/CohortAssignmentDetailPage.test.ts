import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/assignments/CohortAssignmentDetailPage.tsx'),
  'utf8',
);

describe('CohortAssignmentDetailPage behavioral workflow', () => {
    it('does not auto-open the review panel for pending submissions', () => {
        const pageSource = source();
        const selectedReviewStart = pageSource.indexOf('const selectedReviewSubmission = useMemo');
        const selectedReviewEnd = pageSource.indexOf('const selectedReviewEvaluation', selectedReviewStart);
        const selectedReviewBlock = pageSource.slice(selectedReviewStart, selectedReviewEnd);

        expect(pageSource).toContain('const selectedReviewSubmission = useMemo');
        expect(selectedReviewBlock).not.toContain('pendingReviewSubmissions[0]');
        expect(pageSource).not.toContain('setReviewPanelManuallyHidden');
        expect(pageSource).not.toContain('reviewPanelManuallyHidden');
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
    expect(pageSource).toContain('canChangeActiveAssignment && selectedReviewSubmission');
    expect(pageSource).toContain('canChangeActiveAssignment && recordResponsePanelOpen');
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

  it('links read-only learner records to assessment reports with return state', () => {
    const pageSource = source();

    expect(pageSource).toContain('resolveReportSurface');
    expect(pageSource).toContain('buildLearnerAssessmentReportHref');
    expect(pageSource).toContain('returnTo: currentReturnTo');
    expect(pageSource).toContain('renderLearnerReportLink(recipient.student, recipient.student_name');
    expect(pageSource).toContain('renderLearnerReportLink(submission.student, submission.student_name');
    expect(pageSource).toContain('renderLearnerReportLink(');
  });
});
