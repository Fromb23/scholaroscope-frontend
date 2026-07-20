export type SessionLifecycleStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
export type SessionClosureNextStep = 'ATTENDANCE' | 'TAUGHT_OUTCOMES' | 'EVIDENCE' | 'REFLECTION' | 'READY' | 'INTERRUPTED' | string;
export type LessonWorkflowStep = 'scheduled' | 'attendance' | 'confirm_taught' | 'complete' | 'post_lesson' | 'cancelled';
export type LessonWorkflowSection = 'attendance' | 'taught-outcomes' | null;

export function shouldShowParticipatingCohorts(status: SessionLifecycleStatus | null | undefined): boolean {
  return Boolean(status);
}

export function shouldShowMergedCohortBadge({
  isMerged,
  status,
}: {
  isMerged: boolean;
  status: SessionLifecycleStatus | null | undefined;
}): boolean {
  return isMerged && shouldShowParticipatingCohorts(status);
}

export function shouldShowPostLessonAssignmentActions(): boolean {
  return false;
}

export function getLessonWorkflowStep({
  status,
  closureNextStep,
  hasMarkedAttendance,
  hasConfirmedTaughtOutcomes,
}: {
  status: SessionLifecycleStatus | null | undefined;
  closureNextStep?: SessionClosureNextStep | null;
  hasMarkedAttendance: boolean;
  hasConfirmedTaughtOutcomes: boolean;
}): LessonWorkflowStep {
  if (status === 'CANCELLED') {
    return 'cancelled';
  }

  if (status === 'SCHEDULED') {
    return 'scheduled';
  }

  if (status === 'COMPLETED') {
    return 'post_lesson';
  }

  if (status !== 'IN_PROGRESS') {
    return 'scheduled';
  }

  if (closureNextStep === 'ATTENDANCE') {
    return 'attendance';
  }

  if (closureNextStep === 'TAUGHT_OUTCOMES') {
    return 'confirm_taught';
  }

  if (
    closureNextStep === 'EVIDENCE'
    || closureNextStep === 'REFLECTION'
    || closureNextStep === 'READY'
    || closureNextStep === 'INTERRUPTED'
  ) {
    return 'complete';
  }

  if (!hasMarkedAttendance) {
    return 'attendance';
  }

  if (!hasConfirmedTaughtOutcomes) {
    return 'confirm_taught';
  }

  return 'complete';
}

export function isAttendanceCurrentStep(workflowStep: LessonWorkflowStep): boolean {
  return workflowStep === 'attendance';
}

export function isTaughtOutcomesCurrentStep(workflowStep: LessonWorkflowStep): boolean {
  return workflowStep === 'confirm_taught';
}

export function shouldRenderAttendanceEditor({
  workflowStep,
  isAttendanceReviewRequested,
  canAdvanceTeachingWorkflow,
  isHistorical,
}: {
  workflowStep: LessonWorkflowStep;
  isAttendanceReviewRequested: boolean;
  canAdvanceTeachingWorkflow: boolean;
  isHistorical: boolean;
}): boolean {
  if (isHistorical || !canAdvanceTeachingWorkflow) {
    return false;
  }

  return isAttendanceCurrentStep(workflowStep) || isAttendanceReviewRequested;
}

export function shouldRenderTaughtOutcomesEditor({
  workflowStep,
  hasLessonPlan,
  isAttendanceReviewRequested,
  hasConfirmedTaughtOutcomes,
  canAdvanceTeachingWorkflow,
  isHistorical,
}: {
  workflowStep: LessonWorkflowStep;
  hasLessonPlan: boolean;
  isAttendanceReviewRequested: boolean;
  hasConfirmedTaughtOutcomes: boolean;
  canAdvanceTeachingWorkflow: boolean;
  isHistorical: boolean;
}): boolean {
  return Boolean(
    hasLessonPlan
    && !isHistorical
    && canAdvanceTeachingWorkflow
    && isTaughtOutcomesCurrentStep(workflowStep)
    && !isAttendanceReviewRequested
    && !hasConfirmedTaughtOutcomes
  );
}

export function shouldRenderTaughtOutcomesConfirmationSummary({
  hasConfirmedTaughtOutcomes,
  shouldRenderTaughtOutcomesEditor: rendersEditor,
  status,
}: {
  hasConfirmedTaughtOutcomes: boolean;
  shouldRenderTaughtOutcomesEditor: boolean;
  status: SessionLifecycleStatus | null | undefined;
}): boolean {
  return Boolean(
    hasConfirmedTaughtOutcomes
    && !rendersEditor
    && status !== 'SCHEDULED'
    && status !== 'CANCELLED'
  );
}

export function getDefaultOpenLessonWorkflowSection({
  shouldRenderAttendanceEditor: rendersAttendance,
  shouldRenderTaughtOutcomesEditor: rendersTaughtOutcomes,
}: {
  shouldRenderAttendanceEditor: boolean;
  shouldRenderTaughtOutcomesEditor: boolean;
}): LessonWorkflowSection {
  if (rendersAttendance) {
    return 'attendance';
  }

  if (rendersTaughtOutcomes) {
    return 'taught-outcomes';
  }

  return null;
}

export function shouldShowInstructorIdentity({
  activeRole,
  viewMode,
  groupingMode,
  effectiveMyTeachingMode,
  showInstitutionSupervision,
}: {
  activeRole: string | null | undefined;
  viewMode?: string | null;
  groupingMode?: string | null;
  effectiveMyTeachingMode: boolean;
  showInstitutionSupervision: boolean;
}): boolean {
  if (showInstitutionSupervision && viewMode === 'admin_supervision') {
    return true;
  }

  if (groupingMode === 'instructor') {
    return true;
  }

  if (activeRole === 'INSTRUCTOR' || effectiveMyTeachingMode) {
    return false;
  }

  return true;
}
