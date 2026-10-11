import type { ReactNode } from 'react';
import type { Cohort } from '@/app/core/types/academic';

export interface CohortCurriculumSetupModalContext {
  isOpen: boolean;
  cohort: Cohort;
  onClose: () => void;
  onConfigured?: () => void | Promise<void>;
}

export type CohortCurriculumSetupModalRenderer = (
  context: CohortCurriculumSetupModalContext,
) => ReactNode;

let registeredRenderer: CohortCurriculumSetupModalRenderer | null = null;

export function registerCohortCurriculumSetupModal(
  renderer: CohortCurriculumSetupModalRenderer,
): void {
  registeredRenderer = renderer;
}

export function renderCohortCurriculumSetupModal(
  context: CohortCurriculumSetupModalContext,
): ReactNode | null {
  return registeredRenderer?.(context) ?? null;
}
