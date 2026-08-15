import type { LessonPlanStatus } from '@/app/core/types/lessonPlans';

export function getLessonPlanDetailInitialSectionState() {
  return {
    outcomesOpen: false,
    lessonContentOpen: false,
    referencesOpen: false,
    metadataOpen: false,
    generationMetadataOpen: false,
  };
}

export function shouldShowLearnerTaskSection({
  status,
  canPrepareLearnerTask,
  hasPreparedAssignment = false,
}: {
  status: LessonPlanStatus | null | undefined;
  canPrepareLearnerTask: boolean;
  hasPreparedAssignment?: boolean;
}): boolean {
  if (status === 'USED' || status === 'ARCHIVED') {
    return hasPreparedAssignment;
  }
  return canPrepareLearnerTask || hasPreparedAssignment;
}

export function shouldOpenLearnerTaskFromQuery({
  section,
  showLearnerTaskSection,
}: {
  section: string | null | undefined;
  showLearnerTaskSection: boolean;
}): boolean {
  return showLearnerTaskSection && section === 'learner-task';
}
