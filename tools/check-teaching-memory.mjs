#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

const checks = [];

function check(name, passed, detail) {
  checks.push({ name, passed, detail });
}

const instructorDashboard = read('app/core/components/dashboard/InstructorDashboard.tsx');
const teacherNextActionPanel = read('app/core/components/dashboard/TeacherNextActionPanel.tsx');
const sessionReminderPanel = read('app/core/components/dashboard/SessionReminderPanel.tsx');
const dashboardWidgets = read('app/core/components/dashboard/InstructorDashboardWidgets.tsx');
const notificationBell = read('app/components/layout/NotificationBell.tsx');
const assignmentLifecycleCard = read('app/core/components/assignments/AssignmentLifecycleActionCard.tsx');
const assignmentProgressTracker = read('app/core/components/assignments/AssignmentProgressTracker.tsx');
const cohortAssignmentDetail = read('app/core/components/assignments/CohortAssignmentDetailPage.tsx');
const assessmentDetailPage = read('app/core/components/assessments/AssessmentDetailPage.tsx');
const assessmentStageCard = read('app/core/components/assessments/AssessmentStageActionCard.tsx');
const assessmentPolicyPreview = read('app/core/components/assessments/AssessmentPolicyPreviewCard.tsx');
const teachingActionQueue = read('app/core/lib/teachingActionQueue.ts');
const useInstructorDashboard = read('app/core/hooks/useInstructorDashboard.ts');
const useAssignments = read('app/core/hooks/useAssignments.ts');
const cbcAssessmentPolicyPreview = read('app/plugins/cbc/components/reportPolicies/CbcAssessmentPolicyPreview.tsx');
const cbcReportPolicyDetailPage = read('app/plugins/cbc/components/reportPolicies/CbcReportPolicyDetailPage.tsx');
const cbcNavigationExtension = read('app/plugins/cbc/registry/navigationExtension.ts');
const gradePoliciesPage = read('app/core/components/reports/GradePoliciesPage.tsx');
const reportPoliciesHubPage = read('app/core/components/reports/ReportPoliciesHubPage.tsx');

const primaryActionIndex = instructorDashboard.indexOf('<TeacherNextActionPanel');
const assignmentWorkPanelIndex = instructorDashboard.indexOf('<TeachingAssignmentWorkPanel');
const followUpQueueIndex = instructorDashboard.indexOf('<TeachingFollowUpQueue');
const workspaceIndex = instructorDashboard.indexOf('<TeachingWorkspaceCard');

check(
  'InstructorDashboard must render primary teaching action before workspace shortcuts',
  primaryActionIndex >= 0 && workspaceIndex >= 0 && primaryActionIndex < workspaceIndex,
  'Render TeacherNextActionPanel before TeachingWorkspaceCard so unfinished teaching work owns the top of the dashboard.',
);

check(
  'InstructorDashboard must build one shared teaching action queue',
  instructorDashboard.includes('buildTeachingActionQueue(')
    && instructorDashboard.includes('teachingActionQueue')
    && teacherNextActionPanel.includes('queue: TeachingActionQueue'),
  'Dashboard action surfaces must consume the central teachingActionQueue instead of local priority builders.',
);

check(
  'InstructorDashboard must render assignment work from the teaching action queue',
  assignmentWorkPanelIndex >= 0
    && instructorDashboard.includes('function TeachingAssignmentWorkPanel')
    && instructorDashboard.includes('queue.actions.filter((action) => (')
    && instructorDashboard.includes("action.objectType === 'assignment'"),
  'Open assignment workflow items must be rendered from the central queue, not from a second dashboard action engine.',
);

check(
  'Assignment work must not only exist inside a sliced generic follow-up queue',
  assignmentWorkPanelIndex >= 0
    && followUpQueueIndex >= 0
    && assignmentWorkPanelIndex < followUpQueueIndex
    && instructorDashboard.includes("filter((action) => action.objectType !== 'assignment')")
    && instructorDashboard.includes('ASSIGNMENT_WORK_VISIBLE_LIMIT')
    && instructorDashboard.includes('View all assignment work'),
  'Assignment work needs a dedicated visible panel and collapsed count, not only supportingActions.slice(0, 5).',
);

check(
  'Lesson-originated assignment labels must be present on the dashboard',
  instructorDashboard.includes('Prepared from lesson plan')
    && instructorDashboard.includes('Learner task from lesson preparation')
    && instructorDashboard.includes('Prepared learner task')
    && instructorDashboard.includes('Issued learner task')
    && instructorDashboard.includes('Ready to store'),
  'Lesson-originated learner tasks need teacher-facing labels instead of technical status codes.',
);

check(
  'assignment workflow memory must feed the instructor dashboard',
  useInstructorDashboard.includes('useAssignmentTeachingToday')
    && useInstructorDashboard.includes('assignmentWork')
    && instructorDashboard.includes('assignmentWork,'),
  'Self-managed/admin instructor dashboard must include assignment teaching-today workflow items.',
);

check(
  'Workspace shortcuts must not render before primary teaching action or active assignment work',
  primaryActionIndex >= 0
    && assignmentWorkPanelIndex >= 0
    && workspaceIndex >= 0
    && primaryActionIndex < assignmentWorkPanelIndex
    && assignmentWorkPanelIndex < workspaceIndex
    && instructorDashboard.includes('quiet={teachingActionQueue.quiet && !hasActiveAssignmentWork}'),
  'Workspace shortcuts should only become prominent when the dashboard queue is quiet and no assignment work is open.',
);

check(
  'TeacherNextActionPanel must not independently create dashboard actions',
  !teacherNextActionPanel.includes('function buildNextAction')
    && !teacherNextActionPanel.includes('schedule_state ===')
    && teacherNextActionPanel.includes('queue.primaryAction'),
  'TeacherNextActionPanel should render the queue primary action, not compute session priority itself.',
);

check(
  'TeacherNextActionPanel must not show zero-value grading or support memory chips',
  teacherNextActionPanel.includes('visible: metrics.assessments.needsGrading > 0')
    && teacherNextActionPanel.includes('visible: supportCount > 0')
    && teacherNextActionPanel.includes('summaryItems.length > 0 ? ('),
  'The primary panel may stay visible in quiet mode, but zero grading/support chips should not become memory cards.',
);

check(
  'SessionReminderPanel must support queue suppression instead of repeating primary lesson CTAs',
  sessionReminderPanel.includes('Action shown above')
    && sessionReminderPanel.includes('isPrimaryActionObject')
    && sessionReminderPanel.includes('ActionMenu')
    && !sessionReminderPanel.includes('onEndLesson'),
  'Session reminders should become supporting context when the queue already owns that lesson action.',
);

check(
  'Assignment teaching-today query must be invalidated by assignment stage-changing mutations',
  useAssignments.includes('assignmentKeys.teachingToday()')
    && useAssignments.includes('assignmentKeys.preparedForLessonPlan(lessonPlanId)')
    && useAssignments.includes('emitAssignmentOriginChanged')
    && useAssignments.includes('usePrepareAssignmentFromLessonPlan')
    && useAssignments.includes('useIssuePreparedAssignment')
    && useAssignments.includes('useDeleteAssignment')
    && useAssignments.includes('usePublishAssignment')
    && useAssignments.includes('useCloseAssignment')
    && useAssignments.includes('useArchiveAssignment')
    && useAssignments.includes('useRestoreAssignmentToReview')
    && useAssignments.includes('useCreateAssignmentSubmission')
    && useAssignments.includes('useCreateAssignmentEvaluation')
    && useAssignments.includes('useBridgeAssignmentEvaluation'),
  'Prepare, issue, response, review, evidence, store, restore, and delete flows must refresh assignment teaching-today memory.',
);

check(
  'TodayScheduleCard must be contextual, not another action engine',
  dashboardWidgets.includes('Action shown above')
    && dashboardWidgets.includes('getTodayScheduleStatusLabel')
    && dashboardWidgets.includes('if (preview.length === 0) {')
    && !dashboardWidgets.includes('getTodayScheduleActionLabel')
    && !dashboardWidgets.includes('End lesson'),
  'TodayScheduleCard should show schedule context/status and avoid independent End/Continue/Start CTAs.',
);

check(
  'Dashboard must gate learner-risk memory before rendering LearnersAtRisk',
  instructorDashboard.includes('shouldRenderLearnerRiskMemory')
    && instructorDashboard.includes('showLearnerRiskMemory ? (')
    && dashboardWidgets.includes('export function shouldRenderLearnerRiskMemory')
    && dashboardWidgets.includes('return null;'),
  'LearnersAtRisk must not be mounted as a permanent empty attendance or academic-support shell.',
);

check(
  'Dashboard must gate assessment memory before rendering AssessmentsSummaryCard',
  instructorDashboard.includes('shouldRenderAssessmentsSummaryCard')
    && instructorDashboard.includes('showAssessmentMemory ? (')
    && dashboardWidgets.includes('export function shouldRenderAssessmentsSummaryCard')
    && dashboardWidgets.includes('getAssessmentDashboardWorkItems'),
  'AssessmentsSummaryCard must render only for pending review rows or unfinalized assessment work.',
);

check(
  'Assessment memory must keep unfinalized lifecycle work and exact assessment routes',
  teachingActionQueue.includes('assessments?: Assessment[]')
    && teachingActionQueue.includes('AssessmentStatus.FINALIZED')
    && teachingActionQueue.includes('?focus=score-entry')
    && teachingActionQueue.includes('?focus=finalize')
    && teachingActionQueue.includes('?focus=prepare')
    && teachingActionQueue.includes('?focus=review'),
  'Draft and active assessments must stay in the shared teaching queue until finalized and route to assessment detail focus targets.',
);

check(
  'Assessment cards must not contain permanent zero-state grading copy',
  !dashboardWidgets.includes('No learner rows are waiting for review right now')
    && !dashboardWidgets.includes('No review queue right now')
    && !dashboardWidgets.includes('Needs review 0')
    && !dashboardWidgets.includes('Upcoming 0'),
  'Assessment memory must not fill the dashboard with zero-count grading or empty review queue cards.',
);

check(
  'Attendance risk memory must not contain permanent no-risk copy',
  !dashboardWidgets.includes('No current attendance risk')
    && dashboardWidgets.includes('hasAttendanceRisk ? (')
    && dashboardWidgets.includes('hasAcademicSupportRisk ? ('),
  'Learner-risk memory must hide zero attendance and academic support sides instead of rendering no-risk cards.',
);

check(
  'NotificationBell must use mobile-safe panel behavior while preserving desktop dropdown',
  notificationBell.includes('fixed left-3 right-3 top-16')
    && notificationBell.includes('max-h-[70vh]')
    && notificationBell.includes('sm:absolute')
    && notificationBell.includes('sm:right-0')
    && notificationBell.includes('sm:w-80')
    && notificationBell.includes('sm:max-h-80'),
  'NotificationBell must not open a fixed-width desktop dropdown that overflows mobile viewports.',
);

check(
  'Assignment memory panel must still be present and exclude stored work',
  instructorDashboard.includes('function TeachingAssignmentWorkPanel')
    && instructorDashboard.includes("action.objectType === 'assignment'")
    && instructorDashboard.includes("action.assignmentWork.lifecycle_stage !== 'STORED'")
    && teachingActionQueue.includes("item.lifecycle_stage !== 'STORED'"),
  'Open assignments must stay visible while stored/archived assignment work leaves active dashboard memory.',
);

check(
  'CBC assessment policy preview must use target-page capability checks for policy authoring actions',
  cbcAssessmentPolicyPreview.includes('canManageCbcReportPolicyAuthoring')
    && cbcAssessmentPolicyPreview.includes("authoringMode: 'INSTITUTION_GOVERNANCE'")
    && !cbcAssessmentPolicyPreview.includes('isAdminOrAbove'),
  'Visible CBC report policy actions must match the target policy page authorization, not raw ADMIN role.',
);

check(
  'CBC report policy detail page must use target-page capability checks',
  cbcReportPolicyDetailPage.includes('canManageCbcReportPolicyAuthoring')
    && cbcReportPolicyDetailPage.includes("authoringMode: 'INSTITUTION_GOVERNANCE'")
    && !cbcReportPolicyDetailPage.includes('isAdminOrAbove'),
  'CBC report policy pages must use the same capability rule as the visible actions that navigate to them.',
);

check(
  'CBC report policy navigation must use target-page capability checks',
  cbcNavigationExtension.includes('canManageCbcReportPolicyAuthoring')
    && cbcNavigationExtension.includes("authoringMode: 'INSTITUTION_GOVERNANCE'")
    && cbcNavigationExtension.includes('cbcReportPolicyChildren')
    && !cbcNavigationExtension.includes('isAdminOrAbove'),
  'CBC plugin navigation must not expose institution policy authoring from raw ADMIN role alone.',
);

check(
  'Generic report policy actions must use report-policy capability checks',
  assessmentPolicyPreview.includes('canManageInstitutionReportPolicy')
    && gradePoliciesPage.includes('canManageInstitutionReportPolicy')
    && reportPoliciesHubPage.includes('canManageInstitutionReportPolicy')
    && !assessmentPolicyPreview.includes('isAdminOrAbove')
    && !gradePoliciesPage.includes('isAdminOrAbove')
    && !reportPoliciesHubPage.includes('isAdminOrAbove'),
  'Visible generic report policy actions must not be authorized from raw ADMIN role.',
);

check(
  'Assignment lifecycle card must render only one inline primary action and hide secondary actions under More',
  assignmentLifecycleCard.includes('AssignmentProgressTracker')
    && assignmentLifecycleCard.includes('ActionMenu')
    && assignmentLifecycleCard.includes('moreActions')
    && !assignmentLifecycleCard.includes('variant={getActionButtonVariant(action)}'),
  'Assignment lifecycle secondary/corrective actions must be in the More menu.',
);

check(
  'Assignment detail must include a stage/progress component',
  assignmentProgressTracker.includes('Prepared')
    && assignmentProgressTracker.includes('Responses')
    && assignmentProgressTracker.includes('Evidence')
    && cohortAssignmentDetail.includes('getAssignmentCurrentProgressStage'),
  'Assignment detail must expose teacher-facing lifecycle progress.',
);

check(
  'Assessment detail must include a stage/progress component and one primary stage action',
  assessmentDetailPage.includes('AssessmentStageActionCard')
    && assessmentStageCard.includes('getAssessmentCurrentStage')
    && assessmentStageCard.includes('ActionMenu')
    && assessmentStageCard.includes('primaryAction'),
  'Assessment detail must show stage progress, one primary action, and More for secondary actions.',
);

check(
  'Teaching action queue must rank and deduplicate action items',
  teachingActionQueue.includes('dedupeKey')
    && teachingActionQueue.includes('objectKey')
    && teachingActionQueue.includes('suppressedObjectKeys')
    && teachingActionQueue.includes('buildAssignmentTeachingActionItem')
    && teachingActionQueue.includes('rankActions'),
  'The central queue must own ranking, object/action dedupe, and assignment workflow action conversion.',
);

check(
  'Teaching action queue must not promote workspace shortcuts to primary unfinished work',
  teachingActionQueue.includes("unfinishedActions = actions.filter((action) => action.source !== 'workspace_shortcut')")
    && teachingActionQueue.includes('primaryAction = unfinishedActions[0] ?? null')
    && teachingActionQueue.includes('unfinishedWorkCount = unfinishedActions.length'),
  'Quiet dashboards should show the no-action primary panel while workspace shortcuts remain available separately.',
);

const failures = checks.filter((item) => !item.passed);

if (failures.length > 0) {
  console.error('Teaching memory architecture check failed:');
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log(`Teaching memory architecture check passed (${checks.length} checks).`);
