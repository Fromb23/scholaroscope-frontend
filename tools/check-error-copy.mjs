import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'app');
const DEFAULT_BASELINE_REASON = 'Existing migration debt documented during the AppError architecture migration; do not add new occurrences.';
const BASELINE_OWNER = 'frontend-migration';
const REMOVE_BY_BY_PRIORITY = {
  P0: '2026-08-31',
  P1: '2026-10-31',
  P2: '2026-12-31',
};
const VALID_PRIORITIES = new Set(['P0', 'P1', 'P2']);

function priorityFor(relative) {
  if (
    /app\/core\/components\/auth\//.test(relative)
    || /app\/core\/hooks\/useRegister\.ts$/.test(relative)
    || /app\/core\/components\/profile\//.test(relative)
    || /app\/core\/hooks\/useProfile\.ts$/.test(relative)
    || /app\/core\/components\/learners\/NewLearnerPage\.tsx$/.test(relative)
    || /app\/plugins\/cbc\/components\/reportPolicies\/routes\//.test(relative)
    || /app\/core\/components\/reports\/(?:ComputePage|ReportPoliciesHubPage(?:Client)?|GradePoliciesPage(?:Client)?|GradePolicyDetailPage)\.tsx$/.test(relative)
    || /workspace|Workspace|freelance|Freelance/.test(relative)
  ) {
    return 'P0';
  }

  if (
    /app\/core\/components\/superadmin\//.test(relative)
    || /app\/core\/hooks\/(?:useSuperAdminPlugins|usePlatformHealth|useGlobalUsers|useOrganizations)\.ts$/.test(relative)
    || /app\/plugins\/(?:audit|announcements|requests)\//.test(relative)
    || /app\/plugins\/cambridge\/pages\/Cambridge(?:Authoring|Installation)/.test(relative)
    || /app\/plugins\/cambridge\/pages\/authoringUtils\.ts$/.test(relative)
    || /app\/plugins\/cambridge\/components\/CambridgeAuthoring/.test(relative)
  ) {
    return 'P2';
  }

  return 'P1';
}

function metadataForFinding(relative) {
  const priority = priorityFor(relative);
  return {
    owner: BASELINE_OWNER,
    priority,
    removeBy: REMOVE_BY_BY_PRIORITY[priority],
  };
}

// Migration baseline: exact file/rule counts that existed when the AppError architecture was introduced.
// Each entry carries a reason and blocks count increases, so new work cannot add more legacy error copy.
const BASELINE = {
  "app/components/layout/Header.tsx::console-only-catch": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/components/ui/ErrorState.tsx::raw-something-went-wrong": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/AssignSubjectToCohortModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/AssignSubjectToCohortModal.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/cohorts/AdminCohortsPageContent.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/cohorts/AdminCohortsPageContent.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/cohorts/AdminCohortsPageContent.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/cohorts/InstructorMyCohortsPageContent.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/cohorts/InstructorMyCohortsPageContent.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/cohortSubjects/CohortSubjectLearnersPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/cohortSubjects/CohortSubjectLearnersPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/cohortSubjects/CohortSubjectLearnersPage.tsx::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/curricula/CurriculaPage.tsx::direct-extract-error-message-display": {
    "count": 5,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/curricula/CurriculaPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/curricula/CurriculaPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/SubjectComponents.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/SubjectComponents.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/subjects/SubjectCataloguePage.tsx::direct-extract-error-message-display": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/subjects/SubjectCataloguePage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/subjects/SubjectCataloguePage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/subjects/SubjectDetailPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/subjects/SubjectDetailPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/subjects/SubjectsPage.tsx::direct-extract-error-message-display": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/subjects/SubjectsPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/subjects/SubjectsPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/TermComponents.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/TermComponents.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/terms/TermsPage.tsx::direct-extract-error-message-display": {
    "count": 4,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/terms/TermsPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/academic/terms/TermsPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/admin/instructors/InstructorManagementPage.tsx::direct-resolve-app-error": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assessments/AssessmentDetailPage.tsx::error-banner-without-title": {
    "count": 3,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assessments/AssessmentDetailPage.tsx::legacy-error-banner": {
    "count": 3,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assessments/AssessmentParticipationSection.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assessments/AssessmentParticipationSection.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assessments/CreateAssessmentPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assessments/CreateAssessmentPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assessments/EditAssessmentPage.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assessments/EditAssessmentPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assessments/EditAssessmentPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentGroupEvaluationsPanel.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentGroupEvaluationsPanel.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentGroupReviewForm.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentGroupReviewForm.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentGroupsPanel.tsx::error-banner-without-title": {
    "count": 5,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentGroupsPanel.tsx::legacy-error-banner": {
    "count": 5,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentGroupSubmissionsPanel.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentGroupSubmissionsPanel.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentRecordResponsePanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentRecordResponsePanel.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentReviewForm.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/AssignmentReviewForm.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/CohortAssignmentDetailPage.tsx::error-banner-without-title": {
    "count": 3,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/CohortAssignmentDetailPage.tsx::legacy-error-banner": {
    "count": 3,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/CohortAssignmentsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/assignments/CohortAssignmentsPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/auth/ForgotPasswordPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/auth/ForgotPasswordPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/auth/ForgotPasswordPage.tsx::raw-something-went-wrong": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/auth/ResetPasswordPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/auth/ResetPasswordPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/cohorts/CbcPathwayConfigurationFields.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/cohorts/CbcPathwayConfigurationFields.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/cohorts/CohortComponents.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/cohorts/CohortComponents.tsx::error-banner-without-title": {
    "count": 3,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/cohorts/CohortComponents.tsx::legacy-error-banner": {
    "count": 3,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/cohorts/CohortStudentComponents.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/cohorts/CohortStudentComponents.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/curricula/CurriculumFormModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/curricula/CurriculumFormModal.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/curriculum/CurriculumDisableWorkflowModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/curriculum/CurriculumDisableWorkflowModal.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/gradePolicies/PolicyFormModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/gradePolicies/PolicyFormModal.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/instructors/InstructorModals.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/instructors/InstructorModals.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/learners/EditLearnerPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/learners/EditLearnerPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/learners/LearnerDetailPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/learners/LearnerDetailPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/learners/LearnersPage.tsx::direct-extract-error-message-display": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/learners/LearnersPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/learners/LearnersPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/lessonPlans/GenerateLessonPlanPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/lessonPlans/GenerateLessonPlanPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/lessonPlans/GenerateLessonPlanPage.tsx::throw-extract-error-message": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/lessonPlans/LessonPlanDetailPage.tsx::error-banner-without-title": {
    "count": 8,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/lessonPlans/LessonPlanDetailPage.tsx::legacy-error-banner": {
    "count": 8,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/lessonPlans/LessonPlanForm.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/lessonPlans/LessonPlanForm.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/lessonPlans/LessonPlansPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/lessonPlans/LessonPlansPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/AssessmentsReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/AssessmentsReportPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/AttendanceReportPage.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/AttendanceReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/AttendanceReportPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/ClassSubjectReportPage.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/ClassSubjectReportPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/ClassSubjectReportPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/CohortsReportPage.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/CohortsReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/CohortsReportPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/ComputePage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/reports/ComputePage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/reports/GradePoliciesPageClient.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/reports/GradePoliciesPageClient.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/reports/GradePoliciesPageClient.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/reports/GradePolicyDetailPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/reports/GradePolicyDetailPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/reports/InstructorCohortSubjectsReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/InstructorCohortSubjectsReportPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/InstructorReportsOverviewPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/InstructorReportsOverviewPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/LearnerOverviewReportPage.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/LearnerOverviewReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/LearnerOverviewReportPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/LearnerSubjectReportPage.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/LearnerSubjectReportPage.tsx::error-banner-without-title": {
    "count": 5,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/LearnerSubjectReportPage.tsx::legacy-error-banner": {
    "count": 5,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/MidtermIntelligenceReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/MidtermIntelligenceReportPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/ReportPoliciesHubPageClient.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/reports/ReportPoliciesHubPageClient.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/components/reports/StudentsReportPage.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/StudentsReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/StudentsReportPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/SubjectsReportPage.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/SubjectsReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/SubjectsReportPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/TeacherPerformanceReportPage.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/TeacherPerformanceReportPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/reports/TeacherPerformanceReportPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/AddCohortModal.tsx::console-only-catch": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/EditSessionForm.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/EditSessionForm.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/EditSessionForm.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/ParticipatingCohorts.tsx::console-only-catch": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/RescheduleLessonModal.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/RescheduleLessonModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/RescheduleLessonModal.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/SessionDetailPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/SessionDetailPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/SessionForm.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/SessionForm.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/sessions/SessionForm.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/settings/SettingsComponents.tsx::error-banner-without-title": {
    "count": 5,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/settings/SettingsComponents.tsx::legacy-error-banner": {
    "count": 5,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/components/superadmin/GlobalUserComponents.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/components/superadmin/GlobalUserComponents.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/components/superadmin/HealthComponents.tsx::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/components/superadmin/OrgDetailComponents.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/components/superadmin/OrgDetailComponents.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/components/superadmin/SuperAdminSettingsPage.tsx::raw-internal-copy": {
    "count": 4,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/hooks/academic/useSubjectsPage.ts::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/assessments/useAssessmentDetailPage.ts::direct-extract-error-message-display": {
    "count": 4,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/superadmin/usePluginsPage.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useAcademic.ts::raw-failed-to-fetch": {
    "count": 9,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useAcademic.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useAcademic.ts::throw-extract-error-message": {
    "count": 21,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useAcademicIntelligence.ts::raw-failed-to-fetch": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useAssessments.ts::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useAssessments.ts::raw-failed-to-fetch": {
    "count": 8,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useAssessments.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useAssignments.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useAssignments.ts::throw-extract-error-message": {
    "count": 45,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useAttendanceDraft.ts::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useCohorts.ts::raw-failed-to-fetch": {
    "count": 8,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useGlobalUsers.ts::raw-failed-to-fetch": {
    "count": 3,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/hooks/useGlobalUsers.ts::throw-extract-error-message": {
    "count": 12,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/hooks/useGradePolicies.ts::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useGradePolicies.ts::raw-failed-to-fetch": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useInstructorAttendanceRisk.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useInstructorCohortAccess.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useInstructorCohortAccess.ts::throw-extract-error-message": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useInstructors.ts::direct-resolve-app-error": {
    "count": 7,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useLessonPlans.ts::throw-extract-error-message": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useNotifications.ts::empty-catch": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useOrganizations.ts::raw-failed-to-fetch": {
    "count": 4,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/hooks/useOrganizations.ts::throw-extract-error-message": {
    "count": 5,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/hooks/usePlatformHealth.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/hooks/usePlugins.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useProfile.ts::throw-extract-error-message": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P0",
    "removeBy": "2026-08-31"
  },
  "app/core/hooks/useReporting.ts::raw-failed-to-fetch": {
    "count": 21,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useReporting.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useSchemes.ts::throw-extract-error-message": {
    "count": 4,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useSessions.ts::raw-failed-to-fetch": {
    "count": 10,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useSessions.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/core/hooks/useSuperAdminPlugins.ts::raw-failed-to-fetch": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/core/hooks/useSuperAdminPlugins.ts::throw-extract-error-message": {
    "count": 4,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/announcements/components/AnnouncementComponents.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/announcements/components/AnnouncementComponents.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/announcements/components/AnnouncementsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/announcements/components/AnnouncementsPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/announcements/hooks/useAnnouncements.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/audit/hooks/useAuditLogs.ts::raw-failed-to-fetch": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/components/CambridgeAuthoringModals.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/components/CambridgeAuthoringModals.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/components/CambridgeCohortSubjectPanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cambridge/components/CambridgeCohortSubjectPanel.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cambridge/pages/authoringUtils.ts::direct-resolve-app-error": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringFrameworkStrandsPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringFrameworkStrandsPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringProgrammesPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringProgrammesPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringProgrammeSubjectsPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringProgrammeSubjectsPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringStrandChildrenPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringStrandChildrenPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringSubjectFrameworksPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringSubjectFrameworksPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringSubstrandObjectivesPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringSubstrandObjectivesPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringSyllabusChildrenPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeAuthoringSyllabusChildrenPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeInstallationFrameworkStrandsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeInstallationFrameworkStrandsPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeInstallationProgrammeSubjectsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeInstallationProgrammeSubjectsPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeInstallationSubjectFrameworksPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeInstallationSubjectFrameworksPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeInstallationSubjectSyllabusesPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeInstallationSubjectSyllabusesPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeInstallationSyllabusComponentsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeInstallationSyllabusComponentsPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/cambridge/pages/CambridgeOfferingCohortsPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cambridge/pages/CambridgeOfferingCohortsPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cambridge/pages/CambridgeProgressPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cambridge/pages/CambridgeProgressPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cambridge/pages/CambridgeSubjectDetailPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cambridge/pages/CambridgeSubjectDetailPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cambridge/pages/CambridgeSubjectManagementPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cambridge/pages/CambridgeSubjectManagementPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cambridge/pages/CambridgeTeachingSessionPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cambridge/pages/CambridgeTeachingSessionPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/CBCCohortSubjectPanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/CBCCohortSubjectPanel.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/CBCCurriculumModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/CBCCurriculumModal.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/CbcPathwayConfigurationModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/CbcPathwayConfigurationModal.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/fineArts/FineArtsLearnerEvidenceModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/fineArts/FineArtsLearnerEvidenceModal.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/fineArts/FineArtsLearnerWorksheetPanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/fineArts/FineArtsLearnerWorksheetPanel.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/fineArts/FineArtsPracticalRequirementsCard.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/fineArts/FineArtsPracticalRequirementsCard.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/fineArts/FineArtsPracticalRequirementsCard.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/GuidedCohortSetupModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/GuidedCohortSetupModal.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/lessonPlans/CbcLessonPlanOutcomeSelector.tsx::direct-error-message-jsx": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/practicals/MusicPracticalRequirementsCard.tsx::direct-extract-error-message-display": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/practicals/MusicPracticalRequirementsCard.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/practicals/MusicPracticalRequirementsCard.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/practicals/PracticalLearnerEvidencePanel.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/practicals/PracticalLearnerEvidencePanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/practicals/PracticalLearnerEvidencePanel.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/practicals/PracticalLessonPanel.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/practicals/PracticalLessonPanel.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/practicals/PracticalLessonPanel.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/reportPolicies/CbcReportPoliciesPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/reportPolicies/CbcReportPoliciesPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/reportPolicies/CbcReportPolicyDetailPage.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/reportPolicies/CbcReportPolicyDetailPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/reportPolicies/CbcReportPolicyFormModal.tsx::error-banner-without-title": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/reportPolicies/CbcReportPolicyFormModal.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/teaching/CBCEvidenceEntryPage.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/teaching/CBCEvidenceEntryPage.tsx::error-banner-without-title": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/teaching/CBCEvidenceEntryPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/teaching/CBCFineArtsPracticalPage.tsx::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/teaching/CBCFineArtsPracticalPage.tsx::error-banner-without-title": {
    "count": 3,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/teaching/CBCFineArtsPracticalPage.tsx::legacy-error-banner": {
    "count": 3,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/teaching/CBCPracticalPage.tsx::direct-extract-error-message-display": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/teaching/CBCPracticalPage.tsx::error-banner-without-title": {
    "count": 4,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/components/teaching/CBCPracticalPage.tsx::legacy-error-banner": {
    "count": 4,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/context/CBCContext.tsx::empty-catch": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/hooks/useCBC.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/hooks/useCBCAddSessionOutcomesPage.ts::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/hooks/useCBCAuthoringOutcomesPage.ts::direct-extract-error-message-display": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/hooks/useCBCAuthoringStrandsPage.ts::direct-extract-error-message-display": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/hooks/useCBCAuthoringSubStrandsPage.ts::direct-extract-error-message-display": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/hooks/useCBCOutcomeSessionPage.ts::console-only-catch": {
    "count": 3,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/hooks/useCBCOutcomeSessionPage.ts::raw-failed-to-fetch": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/hooks/useCBCOutcomeSessionPage.ts::raw-internal-copy": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/cbc/hooks/useEvidenceEntry.ts::direct-extract-error-message-display": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/requests/hooks/useRequests.ts::raw-failed-to-fetch": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/requests/hooks/useRequests.ts::throw-extract-error-message": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P2",
    "removeBy": "2026-12-31"
  },
  "app/plugins/schemes/components/CreateSchemePage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/schemes/components/SchemeDetailPage.tsx::legacy-error-banner": {
    "count": 2,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
  },
  "app/plugins/schemes/components/SchemesPage.tsx::legacy-error-banner": {
    "count": 1,
    "reason": "Existing migration debt documented during the AppError architecture migration; do not add new occurrences. Review owner/priority/removeBy before committing generated baseline metadata.",
    "owner": "frontend-migration",
    "priority": "P1",
    "removeBy": "2026-10-31"
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
const baselineReductionSuggestions = [];
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
  return path.relative(root, file).split(path.sep).join('/');
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
  for (const match of source.matchAll(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g)) {
    record(file, 'empty-catch', lineFor(source, match.index), 'swallows an error without user feedback or rethrow; surface an AppError or intentionally rethrow.');
  }

  for (const match of source.matchAll(/catch\s*(?:\([^)]*\))?\s*\{([\s\S]{0,600}?)\n\s*\}/g)) {
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

  for (const match of source.matchAll(/\bextractErrorMessage\b/g)) {
    record(file, 'legacy-extract-error-message', lineFor(source, match.index), 'uses the retired raw error extractor; use resolveAppError or resolveErrorMessage.');
  }

  for (const match of source.matchAll(/(["'`])Something went wrong\.?[^"'`]*\1/g)) {
    record(file, 'raw-something-went-wrong', lineFor(source, match.index), 'uses raw "Something went wrong"; use resolveAppError with domain/action context.');
  }

  for (const match of source.matchAll(/(["'`])Failed to fetch[^"'`]*\1/g)) {
    record(file, 'raw-failed-to-fetch', lineFor(source, match.index), 'uses raw "Failed to fetch"; use domain-specific load copy.');
  }

  for (const match of source.matchAll(/throw\s+new\s+Error\s*\(\s*extractErrorMessage\s*\(/g)) {
    record(file, 'throw-extract-error-message', lineFor(source, match.index), 'throws plain Error(extractErrorMessage(...)); throw AppErrorException or resolve at the UI boundary.');
  }

  for (const match of source.matchAll(/\bresolveAppError\s*\(/g)) {
    const line = sourceLine(source, match.index);
    if (/^\s*import\s/.test(line)) continue;
    record(file, 'direct-resolve-app-error', lineFor(source, match.index), 'Use a domain resolver such as resolveTeachingError, resolveLearnerError, resolveReportError, or resolveWorkspaceError.');
  }

  for (const match of source.matchAll(/(?:(?:set[A-Z][A-Za-z]*Error|window\.alert)\s*\(\s*extractErrorMessage\s*\(|(?:message|error)\s*=\s*\{\s*extractErrorMessage\s*\()/g)) {
    record(file, 'direct-extract-error-message-display', lineFor(source, match.index), 'displays extractErrorMessage(...) directly; resolve and sanitize AppError first.');
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
      record(file, 'legacy-error-banner', lineFor(source, match.index), 'renders ErrorBanner directly in a domain component; use AppErrorBanner with a resolved AppError.');
    }

    for (const match of source.matchAll(/<ErrorBanner\b([\s\S]*?)(?:\/>|>)/g)) {
      const attrs = match[1] ?? '';
      if (!hasTitle(attrs)) {
        record(file, 'error-banner-without-title', lineFor(source, match.index), 'renders ErrorBanner without a title; use AppErrorBanner or provide domain-specific title.');
      }
    }
  }

  for (const match of source.matchAll(/\{[^}\n]*(?:\.serverCode|\.rawStatus)[^}\n]*\}/g)) {
    const line = sourceLine(source, match.index);
    if (/NODE_ENV|development|diagnostic|debug/i.test(line)) continue;
    record(file, 'raw-error-diagnostics-rendered', lineFor(source, match.index), 'renders serverCode/rawStatus outside dev diagnostics; keep raw diagnostics out of user-facing error UI.');
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
  } else if (allowed > 0 && finding.count < allowed) {
    baselineReductionSuggestions.push(`${finding.relative}::${finding.rule} can be reduced from ${allowed} to ${finding.count}.`);
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
      reason: `${DEFAULT_BASELINE_REASON} Review owner/priority/removeBy before committing generated baseline metadata.`,
      ...metadataForFinding(finding.relative),
    },
  ]));
  console.log(JSON.stringify(baseline, null, 2));
  process.exit(0);
}

for (const [key, entry] of Object.entries(BASELINE)) {
  if (!entry.reason || entry.reason.trim().length < 12) {
    errors.push(`Baseline entry ${key} must include a specific migration reason.`);
  }
  if (!entry.owner || entry.owner.trim().length < 3) {
    errors.push(`Baseline entry ${key} must include an owner.`);
  }
  if (!entry.priority || !VALID_PRIORITIES.has(entry.priority)) {
    errors.push(`Baseline entry ${key} must include priority P0, P1, or P2.`);
  }
  if (!entry.removeBy || !/^\d{4}-\d{2}-\d{2}$/.test(entry.removeBy)) {
    errors.push(`Baseline entry ${key} must include removeBy as YYYY-MM-DD.`);
  } else {
    const expiresAt = new Date(`${entry.removeBy}T23:59:59Z`);
    if (Number.isNaN(expiresAt.getTime())) {
      errors.push(`Baseline entry ${key} has invalid removeBy date ${entry.removeBy}.`);
    } else if (expiresAt < new Date()) {
      errors.push(`Baseline entry ${key} expired on ${entry.removeBy}.`);
    }
  }
}

if (errors.length > 0) {
  console.error('Error copy check failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

if (baselineReductionSuggestions.length > 0) {
  console.warn('Error copy baseline can be reduced:');
  for (const suggestion of baselineReductionSuggestions.slice(0, 20)) {
    console.warn(`- ${suggestion}`);
  }
  if (baselineReductionSuggestions.length > 20) {
    console.warn(`- ${baselineReductionSuggestions.length - 20} more baseline reductions available.`);
  }
}

console.log('Error copy check passed.');
