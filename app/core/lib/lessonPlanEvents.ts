const LESSON_PLAN_DATA_CHANGED_EVENT = 'scholaroscope:lesson-plans:changed';

export function emitLessonPlanDataChanged(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new Event(LESSON_PLAN_DATA_CHANGED_EVENT));
}

export function subscribeToLessonPlanDataChanged(
    callback: () => void,
): () => void {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    const handler = () => callback();
    window.addEventListener(LESSON_PLAN_DATA_CHANGED_EVENT, handler);

    return () => {
        window.removeEventListener(LESSON_PLAN_DATA_CHANGED_EVENT, handler);
    };
}
