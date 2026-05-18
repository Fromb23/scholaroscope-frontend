import type { LessonPlanOutcomeProviderRegistration } from '@/app/core/types/lessonPlanCurriculum';

const lessonPlanOutcomeProviders = new Map<string, LessonPlanOutcomeProviderRegistration>();

export function registerLessonPlanOutcomeProvider(
    registration: LessonPlanOutcomeProviderRegistration,
): void {
    if (lessonPlanOutcomeProviders.has(registration.provider)) {
        return;
    }

    lessonPlanOutcomeProviders.set(registration.provider, registration);
}

export function getLessonPlanOutcomeProvider(provider: string) {
    return lessonPlanOutcomeProviders.get(provider) ?? null;
}
