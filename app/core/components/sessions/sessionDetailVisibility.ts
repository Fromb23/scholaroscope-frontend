export type SessionLifecycleStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;

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
