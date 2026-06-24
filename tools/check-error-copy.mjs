import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'app');

// Migration baseline: exact file/rule counts that existed when the AppError architecture was introduced.
// Each entry carries a reason and blocks count increases, so new work cannot add more legacy error copy.
const BASELINE = {
  "app/components/export/ExportModal.tsx::console-only-catch": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/components/layout/Header.tsx::console-only-catch": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/components/ui/ErrorState.tsx::raw-something-went-wrong": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/academic/AssignSubjectToCohortModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/academic/cohorts/AdminCohortsPageContent.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/academic/cohorts/InstructorMyCohortsPageContent.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/academic/cohortSubjects/CohortSubjectLearnersPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/academic/cohortSubjects/CohortSubjectLearnersPage.tsx::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/academic/curricula/CurriculaPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/academic/SubjectComponents.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/academic/subjects/SubjectDetailPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/academic/subjects/SubjectsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/academic/TermComponents.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/academic/terms/TermsPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assessments/AssessmentDetailPage.tsx::error-banner-without-title": {
    "count": 3,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assessments/AssessmentParticipationSection.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assessments/CreateAssessmentPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assessments/EditAssessmentPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assignments/AssignmentGroupEvaluationsPanel.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assignments/AssignmentGroupReviewForm.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assignments/AssignmentGroupsPanel.tsx::error-banner-without-title": {
    "count": 5,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assignments/AssignmentGroupSubmissionsPanel.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assignments/AssignmentRecordResponsePanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assignments/AssignmentReviewForm.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assignments/CohortAssignmentDetailPage.tsx::error-banner-without-title": {
    "count": 3,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/assignments/CohortAssignmentsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/auth/ForgotPasswordPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/auth/ForgotPasswordPage.tsx::raw-something-went-wrong": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/auth/ResetPasswordPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/cohorts/CbcPathwayConfigurationFields.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/cohorts/CohortComponents.tsx::error-banner-without-title": {
    "count": 3,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/cohorts/CohortStudentComponents.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/curricula/CurriculumFormModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/curriculum/CurriculumDisableWorkflowModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/gradePolicies/PolicyFormModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/instructors/InstructorModals.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/learners/EditLearnerPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/learners/LearnerDetailPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/learners/LearnersPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/lessonPlans/GenerateLessonPlanPage.tsx::error-banner-without-title": {
    "count": 3,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/lessonPlans/GenerateLessonPlanPage.tsx::throw-extract-error-message": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/lessonPlans/LessonPlanDetailPage.tsx::error-banner-without-title": {
    "count": 8,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/lessonPlans/LessonPlanForm.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/lessonPlans/LessonPlansPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/AssessmentsReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/AttendanceReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/ClassSubjectReportPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/CohortsReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/ComputePage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/GradePoliciesPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/GradePolicyDetailPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/InstructorCohortSubjectsReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/InstructorReportsOverviewPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/LearnerOverviewReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/LearnerSubjectReportPage.tsx::error-banner-without-title": {
    "count": 5,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/MidtermIntelligenceReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/ReportPoliciesHubPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/StudentsReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/SubjectsReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/reports/TeacherPerformanceReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/sessions/AddCohortModal.tsx::console-only-catch": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/sessions/EditSessionForm.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/sessions/ParticipatingCohorts.tsx::console-only-catch": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/sessions/RescheduleLessonModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/sessions/SessionDetailPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/sessions/SessionForm.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/settings/SettingsComponents.tsx::error-banner-without-title": {
    "count": 5,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/superadmin/GlobalUserComponents.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/superadmin/HealthComponents.tsx::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/superadmin/OrgDetailComponents.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/components/superadmin/SuperAdminSettingsPage.tsx::raw-internal-copy": {
    "count": 4,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/superadmin/usePluginsPage.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useAcademic.ts::raw-failed-to-fetch": {
    "count": 9,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useAcademic.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useAcademic.ts::throw-extract-error-message": {
    "count": 21,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useAcademicIntelligence.ts::raw-failed-to-fetch": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useAssessments.ts::raw-failed-to-fetch": {
    "count": 8,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useAssessments.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useAssignments.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useAssignments.ts::throw-extract-error-message": {
    "count": 45,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useCohorts.ts::raw-failed-to-fetch": {
    "count": 8,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useGlobalUsers.ts::raw-failed-to-fetch": {
    "count": 3,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useGlobalUsers.ts::throw-extract-error-message": {
    "count": 12,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useGradePolicies.ts::raw-failed-to-fetch": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useInstructorAttendanceRisk.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useInstructorCohortAccess.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useInstructorCohortAccess.ts::throw-extract-error-message": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useLessonPlans.ts::throw-extract-error-message": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useOrganizations.ts::raw-failed-to-fetch": {
    "count": 4,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useOrganizations.ts::throw-extract-error-message": {
    "count": 5,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/usePlatformHealth.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/usePlugins.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useProfile.ts::throw-extract-error-message": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useReporting.ts::raw-failed-to-fetch": {
    "count": 21,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useReporting.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useSchemes.ts::throw-extract-error-message": {
    "count": 4,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useSessions.ts::raw-failed-to-fetch": {
    "count": 10,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useSessions.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useSuperAdminPlugins.ts::raw-failed-to-fetch": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/core/hooks/useSuperAdminPlugins.ts::throw-extract-error-message": {
    "count": 4,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/announcements/components/AnnouncementComponents.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/announcements/components/AnnouncementsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/announcements/hooks/useAnnouncements.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/audit/hooks/useAuditLogs.ts::raw-failed-to-fetch": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/components/CambridgeAuthoringModals.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/components/CambridgeCohortSubjectPanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringFrameworkStrandsPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringProgrammesPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringProgrammeSubjectsPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringStrandChildrenPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringSubjectFrameworksPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringSubstrandObjectivesPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringSyllabusChildrenPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeInstallationFrameworkStrandsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeInstallationProgrammeSubjectsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeInstallationSubjectFrameworksPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeInstallationSubjectSyllabusesPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeInstallationSyllabusComponentsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeOfferingCohortsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeProgressPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeSubjectDetailPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeSubjectManagementPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cambridge/pages/CambridgeTeachingSessionPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/CBCCohortSubjectPanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/CBCCurriculumModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/CbcPathwayConfigurationModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/fineArts/FineArtsLearnerEvidenceModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/fineArts/FineArtsLearnerWorksheetPanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/fineArts/FineArtsPracticalRequirementsCard.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/GuidedCohortSetupModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/lessonPlans/CbcLessonPlanOutcomeSelector.tsx::direct-error-message-jsx": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/practicals/MusicPracticalRequirementsCard.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/practicals/PracticalLearnerEvidencePanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/practicals/PracticalLessonPanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/reportPolicies/CbcReportPoliciesPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/reportPolicies/CbcReportPolicyDetailPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/reportPolicies/CbcReportPolicyFormModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/teaching/CBCEvidenceEntryPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/teaching/CBCFineArtsPracticalPage.tsx::error-banner-without-title": {
    "count": 3,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/components/teaching/CBCPracticalPage.tsx::error-banner-without-title": {
    "count": 4,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/hooks/useCBC.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/hooks/useCBCOutcomeSessionPage.ts::console-only-catch": {
    "count": 3,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/hooks/useCBCOutcomeSessionPage.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/cbc/hooks/useCBCOutcomeSessionPage.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/requests/hooks/useRequests.ts::raw-failed-to-fetch": {
    "count": 2,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  },
  "app/plugins/requests/hooks/useRequests.ts::throw-extract-error-message": {
    "count": 1,
    "reason": "Existing migration debt documented when AppError architecture was introduced; do not add new occurrences."
  }
};

const INTERNAL_PATTERNS = [
  'IntegrityError',
  'DoesNotExist',
  'Traceback',
  'stack trace',
  'duplicate key value violates',
  'matching query does not exist',
  'PermissionDenied at',
  '/api/',
  'SQL',
  'undefined is not',
  'null is not',
  'object Object',
];

const errors = [];
const findings = new Map();

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules'
        || entry.name === '.next'
        || entry.name === '__snapshots__'
        || fullPath.includes(`${path.sep}app${path.sep}components${path.sep}ui${path.sep}errors`)
        || fullPath.includes(`${path.sep}app${path.sep}core${path.sep}errors`)
      ) {
        return [];
      }
      return walk(fullPath);
    }
    if (!/\.(tsx|ts)$/.test(entry.name)) return [];
    if (/\.snap\.(tsx|ts)$/.test(entry.name)) return [];
    if (/\.test\.(tsx|ts)$/.test(entry.name) && !scanRoot.includes('.tmp-error-copy-check')) return [];
    return [fullPath];
  });
}

function rel(file) {
  return path.relative(root, file);
}

function lineFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function sourceLine(source, index) {
  const start = source.lastIndexOf('\n', index) + 1;
  const end = source.indexOf('\n', index);
  return source.slice(start, end === -1 ? source.length : end);
}

function record(file, rule, line, message) {
  const relative = rel(file);
  const key = `${relative}::${rule}`;
  if (!findings.has(key)) findings.set(key, { relative, rule, count: 0, examples: [] });
  const finding = findings.get(key);
  finding.count += 1;
  if (finding.examples.length < 3) finding.examples.push(`${relative}:${line} ${message}`);
}

function countBaseline(relative, rule) {
  return BASELINE[`${relative}::${rule}`]?.count ?? 0;
}

function hasTitle(attrs) {
  return /\btitle\s*=/.test(attrs);
}

function isDomainComponent(relative) {
  return /app\/(?:core\/components|plugins|\(dashboard\)|\(auth\))\//.test(relative);
}

function scanCatchBlocks(file, source) {
  for (const match of source.matchAll(/catch\s*\([^)]*\)\s*\{([\s\S]{0,600}?)\n\s*\}/g)) {
    const body = match[1] ?? '';
    if (!/console\.error\s*\(/.test(body)) continue;
    if (/set[A-Z][A-Za-z]*Error\s*\(|throw\b|return\b|toast\s*\(|AppErrorBanner|ErrorBanner/.test(body)) continue;
    record(file, 'console-only-catch', lineFor(source, match.index), 'logs an error in a catch block without user feedback; surface an AppError or intentionally rethrow.');
  }
}

for (const file of walk(scanRoot)) {
  if (!statSync(file).isFile()) continue;
  const source = readFileSync(file, 'utf8');
  const relative = rel(file);

  for (const match of source.matchAll(/(["'`])Something went wrong\.?[^"'`]*\1/g)) {
    record(file, 'raw-something-went-wrong', lineFor(source, match.index), 'uses raw "Something went wrong"; use resolveAppError with domain/action context.');
  }

  for (const match of source.matchAll(/(["'`])Failed to fetch[^"'`]*\1/g)) {
    record(file, 'raw-failed-to-fetch', lineFor(source, match.index), 'uses raw "Failed to fetch"; use domain-specific load copy.');
  }

  for (const match of source.matchAll(/throw\s+new\s+Error\s*\(\s*extractErrorMessage\s*\(/g)) {
    record(file, 'throw-extract-error-message', lineFor(source, match.index), 'throws plain Error(extractErrorMessage(...)); throw AppErrorException or resolve at the UI boundary.');
  }

  for (const match of source.matchAll(/\b(?:err|error)\.message\b/g)) {
    const prefix = source.slice(Math.max(0, match.index - 120), match.index);
    const suffix = source.slice(match.index, match.index + 160);
    if (/[<{=]\s*$/.test(prefix) || /^\w*\.message\s*[})]/.test(suffix)) {
      record(file, 'direct-error-message-jsx', lineFor(source, match.index), 'renders err.message/error.message directly; resolve and sanitize AppError first.');
    }
  }

  if (isDomainComponent(relative)) {
    for (const match of source.matchAll(/<ErrorBanner\b([\s\S]*?)(?:\/>|>)/g)) {
      const attrs = match[1] ?? '';
      if (!hasTitle(attrs)) {
        record(file, 'error-banner-without-title', lineFor(source, match.index), 'renders ErrorBanner without a title; use AppErrorBanner or provide domain-specific title.');
      }
    }
  }

  for (const literal of INTERNAL_PATTERNS) {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp('(["\'`])[^"\'`]*' + escaped + '[^"\'`]*\\1', 'gi');
    for (const match of source.matchAll(pattern)) {
      const line = sourceLine(source, match.index);
      if (/^\s*import\s/.test(line) || /app\/(?:core|plugins)\/[^/]+\/api\//.test(relative) || /app\/core\/api\//.test(relative)) {
        continue;
      }
      record(file, 'raw-internal-copy', lineFor(source, match.index), `contains backend/developer internal text "${literal}" in frontend copy.`);
    }
  }

  scanCatchBlocks(file, source);
}

for (const finding of findings.values()) {
  const allowed = countBaseline(finding.relative, finding.rule);
  if (finding.count > allowed) {
    const delta = finding.count - allowed;
    errors.push(...finding.examples.slice(0, delta || 1));
    if (finding.count > finding.examples.length) {
      errors.push(`${finding.relative} has ${finding.count} ${finding.rule} findings (${allowed} baseline).`);
    }
  }
}

if (process.env.PRINT_ERROR_COPY_BASELINE === '1') {
  const sorted = [...findings.values()].sort((a, b) => (
    `${a.relative}::${a.rule}`.localeCompare(`${b.relative}::${b.rule}`)
  ));
  const baseline = Object.fromEntries(sorted.map((finding) => [
    `${finding.relative}::${finding.rule}`,
    {
      count: finding.count,
      reason: 'Existing migration debt documented when AppError architecture was introduced; do not add new occurrences.',
    },
  ]));
  console.log(JSON.stringify(baseline, null, 2));
  process.exit(0);
}

for (const [key, entry] of Object.entries(BASELINE)) {
  if (!entry.reason || entry.reason.trim().length < 12) {
    errors.push(`Baseline entry ${key} must include a specific migration reason.`);
  }
}

if (errors.length > 0) {
  console.error('Error copy check failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Error copy check passed.');
