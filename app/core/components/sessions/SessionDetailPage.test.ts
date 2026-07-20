import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/sessions/SessionDetailPage.tsx'),
  'utf8',
);

describe('SessionDetailPage attendance learner links', () => {
  it('builds attendance learner links from session context', () => {
    const component = source();

    expect(component).toContain('buildSessionLearnerAttendanceReportHref');
    expect(component).toContain('studentId: record.student');
    expect(component).toContain('sessionId: session.id');
    expect(component).toContain('termId: session.term');
    expect(component).toContain('cohortId: session.cohort_id');
    expect(component).toContain('subjectId: session.subject_id');
    expect(component).toContain('cohortSubjectId: session.cohort_subject');
  });

  it('passes the scoped learner href builder into AttendanceTable', () => {
    const component = source();

    expect(component).toContain('learnerHrefBuilder={buildAttendanceLearnerHref}');
  });

  it('keeps session ask-admin actions behind backend workspace governance', () => {
    const component = source();

    expect(component).toContain('viewerActions');
    expect(component).toContain('showInternalRequestActions');
    expect(component).toContain('concreteRequestActions');
    expect(component).toContain('can_request_reschedule');
    expect(component).toContain('can_request_cancellation');
    expect(component).toContain('can_request_attendance_help');
    expect(component).toContain('viewerActions?.can_submit_admin_request === true');
    expect(component).toContain('concreteRequestActions.some(Boolean)');
    expect(component).not.toContain('(!canCreateTeachingRecords || isCompleted) && showInternalRequestActions');
    expect(component).toContain('Ask admin to reschedule');
    expect(component).toContain('Ask admin to cancel');
    expect(component).toContain('Ask admin about attendance');
  });

  it('rejects unsafe returnTo values on the session detail back link', () => {
    const component = source();

    expect(component).toContain('isSafeNextPath(returnTo) ? returnTo : \'/sessions\'');
    expect(component).not.toContain('returnTo?.startsWith(\'/\') ? returnTo : \'/sessions\'');
  });

  it('does not render an empty internal request panel', () => {
    const component = source();

    expect(component).toContain('concreteRequestActions.some(Boolean)');
    expect(component).toContain('{showInternalRequestActions ? (');
  });

  it('shows a read-only supervision card for unfinished instructor-owned workflow steps', () => {
    const component = source();

    expect(component).toContain('isSupervisionOnlyWorkflow');
    expect(component).toContain('Teacher action required');
    expect(component).toContain('Current stage:');
    expect(component).toContain('The assigned instructor must complete this lesson record.');
    expect(component).toContain("label: 'View lesson workflow'");
    expect(component).toContain("scrollToSection('workflow-section')");
  });

  it('does not use lesson preparation as the current-action fallback for closure stages', () => {
    const component = source();
    const supervisionBranch = component.indexOf('isSupervisionOnlyWorkflow');
    const lessonPreparationFallback = component.indexOf("label: 'View lesson preparation'", supervisionBranch);

    expect(supervisionBranch).toBeGreaterThan(-1);
    expect(lessonPreparationFallback).toBeGreaterThan(supervisionBranch);
    expect(component).toContain("supervisedWorkflowStage === 'EVIDENCE'");
    expect(component).toContain("supervisedWorkflowStage === 'REFLECTION'");
    expect(component).toContain("supervisedWorkflowStage === 'READY'");
  });

  it('keeps assigned instructor closure actions behind viewer_can_advance', () => {
    const component = source();

    expect(component).toContain('viewerCanAdvanceWorkflow');
    expect(component).toContain('canAdvanceTeachingWorkflow');
    expect(component).toContain("label: 'Record learner performance'");
    expect(component).toContain("label: 'Add lesson reflection'");
    expect(component).toContain("label: 'Close lesson record'");
    expect(component).toContain("label: 'Take attendance'");
    expect(component).toContain("label: 'Confirm what was taught'");
  });

  it('uses explicit progressive disclosure helpers for attendance and taught outcomes', () => {
    const component = source();

    expect(component).toContain('getLessonWorkflowStep');
    expect(component).toContain('shouldRenderAttendanceEditor');
    expect(component).toContain('shouldRenderTaughtOutcomesEditor');
    expect(component).toContain('getDefaultOpenLessonWorkflowSection');
    expect(component).toContain('attendanceReviewRequested');
    expect(component).toContain('setTaughtOutcomesOpen(false)');
    expect(component).toContain('setAttendanceOpen(false)');
  });

  it('closes taught outcomes immediately after successful confirmation', () => {
    const component = source();
    const confirmMutation = component.indexOf('await confirmTaughtOutcomes({');
    const localConfirmation = component.indexOf('setTaughtOutcomesConfirmedLocally(true);', confirmMutation);
    const closeTaughtOutcomes = component.indexOf('setTaughtOutcomesOpen(false);', localConfirmation);

    expect(confirmMutation).toBeGreaterThan(-1);
    expect(localConfirmation).toBeGreaterThan(confirmMutation);
    expect(closeTaughtOutcomes).toBeGreaterThan(localConfirmation);
    expect(component).toContain('showTaughtOutcomesConfirmationSummary');
    expect(component).toContain('What was taught confirmed');
  });

  it('provides a visible path back from reviewed attendance to taught-outcome confirmation', () => {
    const component = source();

    expect(component).toContain('Return to what was taught');
    expect(component).toContain('onClick={revealTaughtOutcomesSection}');
    expect(component).not.toContain('Review attendance can do nothing');
  });

  it('renders requires-review as a neutral review state', () => {
    const component = source();

    expect(component).toContain("supervisedWorkflowStage === 'REQUIRES_REVIEW'");
    expect(component).toContain('Review lesson record');
    expect(component).toContain('buildSupervisionMissingMessage');
  });
});
