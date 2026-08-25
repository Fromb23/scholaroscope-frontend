import type { AssessmentObjectiveProviderRegistration } from '@/app/core/types/assessment';

const assessmentObjectiveProviders = new Map<string, AssessmentObjectiveProviderRegistration>();

export function registerAssessmentObjectiveProvider(
  registration: AssessmentObjectiveProviderRegistration,
): void {
  if (assessmentObjectiveProviders.has(registration.provider)) {
    return;
  }

  assessmentObjectiveProviders.set(registration.provider, registration);
}

export function getAssessmentObjectiveProvider(provider: string) {
  return assessmentObjectiveProviders.get(provider) ?? null;
}
