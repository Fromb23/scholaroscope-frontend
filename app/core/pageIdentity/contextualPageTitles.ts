import type { OperatingContext } from '@/app/core/types/auth';

export function getLearnersPageTitle(teachingSurface: boolean): string {
  return teachingSurface ? 'My Learners' : 'Learners';
}

export function getCohortsPageTitle(
  activeOperatingContext: OperatingContext | null | undefined,
  instructorClassesLabel: string,
): string {
  return activeOperatingContext === 'MY_TEACHING' ? instructorClassesLabel : 'Cohorts';
}

export function getProjectStreamsPageTitle(projectTitle?: string | null): string {
  return projectTitle?.trim() || 'Project Streams';
}

interface CohortAssignmentsPageTitleInput {
  accessConfirmed: boolean;
  cohortName?: string | null;
  subjectName?: string | null;
}

export function getCohortAssignmentsPageTitle({
  accessConfirmed,
  cohortName,
  subjectName,
}: CohortAssignmentsPageTitleInput): string {
  const cleanCohortName = cohortName?.trim();
  if (!accessConfirmed || !cleanCohortName) return 'Assignments';

  const cleanSubjectName = subjectName?.trim();
  return cleanSubjectName
    ? `Assignments — ${cleanSubjectName} — ${cleanCohortName}`
    : `Assignments — ${cleanCohortName}`;
}
