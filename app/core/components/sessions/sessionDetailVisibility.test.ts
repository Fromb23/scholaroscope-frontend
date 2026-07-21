import { describe, expect, it } from 'vitest';

import {
  getDefaultOpenLessonWorkflowSection,
  getLessonWorkflowStep,
  shouldRenderAttendanceEditor,
  shouldRenderTaughtOutcomesConfirmationSummary,
  shouldRenderTaughtOutcomesEditor,
  shouldShowMergedCohortBadge,
  shouldShowParticipatingCohorts,
  shouldShowPostLessonAssignmentActions,
  shouldShowInstructorIdentity,
} from './sessionDetailVisibility';

describe('session detail visibility rules', () => {
  it('keeps participating cohorts visible after completion or cancellation', () => {
    expect(shouldShowParticipatingCohorts('COMPLETED')).toBe(true);
    expect(shouldShowParticipatingCohorts('CANCELLED')).toBe(true);
    expect(shouldShowParticipatingCohorts('SCHEDULED')).toBe(true);
    expect(shouldShowParticipatingCohorts('IN_PROGRESS')).toBe(true);
  });

  it('shows the multi-cohort badge whenever a session has multiple visible cohorts', () => {
    expect(shouldShowMergedCohortBadge({ isMerged: true, status: 'COMPLETED' })).toBe(true);
    expect(shouldShowMergedCohortBadge({ isMerged: true, status: 'IN_PROGRESS' })).toBe(true);
    expect(shouldShowMergedCohortBadge({ isMerged: false, status: 'IN_PROGRESS' })).toBe(false);
  });

  it('keeps completed session assignment creation and issue actions hidden', () => {
    expect(shouldShowPostLessonAssignmentActions()).toBe(false);
  });
});

describe('session detail progressive disclosure visibility', () => {
  it('opens attendance first when backend closure requires attendance', () => {
    const workflowStep = getLessonWorkflowStep({
      status: 'IN_PROGRESS',
      closureNextStep: 'ATTENDANCE',
      hasMarkedAttendance: false,
      hasConfirmedTaughtOutcomes: false,
    });

    const rendersAttendance = shouldRenderAttendanceEditor({
      workflowStep,
      isAttendanceReviewRequested: false,
      canAdvanceTeachingWorkflow: true,
      isHistorical: false,
    });
    const rendersTaughtOutcomes = shouldRenderTaughtOutcomesEditor({
      workflowStep,
      hasLessonPlan: true,
      isAttendanceReviewRequested: false,
      hasConfirmedTaughtOutcomes: false,
      canAdvanceTeachingWorkflow: true,
      isHistorical: false,
    });

    expect(workflowStep).toBe('attendance');
    expect(rendersAttendance).toBe(true);
    expect(rendersTaughtOutcomes).toBe(false);
    expect(getDefaultOpenLessonWorkflowSection({
      shouldRenderAttendanceEditor: rendersAttendance,
      shouldRenderTaughtOutcomesEditor: rendersTaughtOutcomes,
    })).toBe('attendance');
  });

  it('closes attendance and opens taught outcomes when backend closure requires taught outcomes', () => {
    const workflowStep = getLessonWorkflowStep({
      status: 'IN_PROGRESS',
      closureNextStep: 'TAUGHT_OUTCOMES',
      hasMarkedAttendance: true,
      hasConfirmedTaughtOutcomes: false,
    });

    const rendersAttendance = shouldRenderAttendanceEditor({
      workflowStep,
      isAttendanceReviewRequested: false,
      canAdvanceTeachingWorkflow: true,
      isHistorical: false,
    });
    const rendersTaughtOutcomes = shouldRenderTaughtOutcomesEditor({
      workflowStep,
      hasLessonPlan: true,
      isAttendanceReviewRequested: false,
      hasConfirmedTaughtOutcomes: false,
      canAdvanceTeachingWorkflow: true,
      isHistorical: false,
    });

    expect(workflowStep).toBe('confirm_taught');
    expect(rendersAttendance).toBe(false);
    expect(rendersTaughtOutcomes).toBe(true);
    expect(getDefaultOpenLessonWorkflowSection({
      shouldRenderAttendanceEditor: rendersAttendance,
      shouldRenderTaughtOutcomesEditor: rendersTaughtOutcomes,
    })).toBe('taught-outcomes');
  });

  it('lets review attendance reopen attendance while minimizing taught outcomes', () => {
    const workflowStep = getLessonWorkflowStep({
      status: 'IN_PROGRESS',
      closureNextStep: 'TAUGHT_OUTCOMES',
      hasMarkedAttendance: true,
      hasConfirmedTaughtOutcomes: false,
    });

    expect(shouldRenderAttendanceEditor({
      workflowStep,
      isAttendanceReviewRequested: true,
      canAdvanceTeachingWorkflow: true,
      isHistorical: false,
    })).toBe(true);
    expect(shouldRenderTaughtOutcomesEditor({
      workflowStep,
      hasLessonPlan: true,
      isAttendanceReviewRequested: true,
      hasConfirmedTaughtOutcomes: false,
      canAdvanceTeachingWorkflow: true,
      isHistorical: false,
    })).toBe(false);
  });

  it('removes the full taught-outcomes editor after taught outcomes are confirmed', () => {
    const workflowStep = getLessonWorkflowStep({
      status: 'IN_PROGRESS',
      closureNextStep: 'EVIDENCE',
      hasMarkedAttendance: true,
      hasConfirmedTaughtOutcomes: true,
    });
    const rendersTaughtOutcomes = shouldRenderTaughtOutcomesEditor({
      workflowStep,
      hasLessonPlan: true,
      isAttendanceReviewRequested: false,
      hasConfirmedTaughtOutcomes: true,
      canAdvanceTeachingWorkflow: true,
      isHistorical: false,
    });

    expect(workflowStep).toBe('complete');
    expect(rendersTaughtOutcomes).toBe(false);
    expect(shouldRenderTaughtOutcomesConfirmationSummary({
      hasConfirmedTaughtOutcomes: true,
      shouldRenderTaughtOutcomesEditor: rendersTaughtOutcomes,
      status: 'IN_PROGRESS',
    })).toBe(true);
  });

  it('does not reopen prior editors for overdue or completed lessons when backend says another step is current', () => {
    expect(getLessonWorkflowStep({
      status: 'IN_PROGRESS',
      closureNextStep: 'REFLECTION',
      hasMarkedAttendance: true,
      hasConfirmedTaughtOutcomes: true,
    })).toBe('complete');

    const completedWorkflowStep = getLessonWorkflowStep({
      status: 'COMPLETED',
      closureNextStep: 'READY',
      hasMarkedAttendance: true,
      hasConfirmedTaughtOutcomes: true,
    });

    expect(completedWorkflowStep).toBe('post_lesson');
    expect(shouldRenderAttendanceEditor({
      workflowStep: completedWorkflowStep,
      isAttendanceReviewRequested: false,
      canAdvanceTeachingWorkflow: true,
      isHistorical: false,
    })).toBe(false);
    expect(shouldRenderTaughtOutcomesEditor({
      workflowStep: completedWorkflowStep,
      hasLessonPlan: true,
      isAttendanceReviewRequested: false,
      hasConfirmedTaughtOutcomes: true,
      canAdvanceTeachingWorkflow: true,
      isHistorical: false,
    })).toBe(false);
  });

  it('preserves supervisor read-only behavior by withholding active editors without advance permission', () => {
    const workflowStep = getLessonWorkflowStep({
      status: 'IN_PROGRESS',
      closureNextStep: 'ATTENDANCE',
      hasMarkedAttendance: false,
      hasConfirmedTaughtOutcomes: false,
    });

    expect(shouldRenderAttendanceEditor({
      workflowStep,
      isAttendanceReviewRequested: false,
      canAdvanceTeachingWorkflow: false,
      isHistorical: false,
    })).toBe(false);
  });
});

describe('session list instructor identity display policy', () => {
  it('hides instructor identity for instructor self-teaching views', () => {
    expect(shouldShowInstructorIdentity({
      activeRole: 'INSTRUCTOR',
      effectiveMyTeachingMode: true,
      showInstitutionSupervision: false,
    })).toBe(false);
  });

  it('hides instructor identity for effective My Lessons self-teaching views', () => {
    expect(shouldShowInstructorIdentity({
      activeRole: 'ADMIN',
      viewMode: 'my_teaching',
      groupingMode: 'class',
      effectiveMyTeachingMode: true,
      showInstitutionSupervision: false,
    })).toBe(false);
  });

  it('shows instructor identity for administrator supervision and instructor grouping views', () => {
    expect(shouldShowInstructorIdentity({
      activeRole: 'ADMIN',
      viewMode: 'admin_supervision',
      groupingMode: 'class',
      effectiveMyTeachingMode: false,
      showInstitutionSupervision: true,
    })).toBe(true);

    expect(shouldShowInstructorIdentity({
      activeRole: 'ADMIN',
      viewMode: 'admin_supervision',
      groupingMode: 'instructor',
      effectiveMyTeachingMode: false,
      showInstitutionSupervision: true,
    })).toBe(true);
  });
});
