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
  canShowLearnerTaskAction,
}: {
  status: LessonPlanStatus | null | undefined;
  canShowLearnerTaskAction: boolean;
}): boolean {
  return status !== 'USED' && status !== 'ARCHIVED' && canShowLearnerTaskAction;
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
