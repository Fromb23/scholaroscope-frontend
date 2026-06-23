import { redirect } from 'next/navigation';

export function NewSessionRedirectPage() {
    redirect('/lesson-plans/new');
    return null;
}

export function GenerateLessonPlanRedirectPage() {
    redirect('/lesson-plans/new');
    return null;
}
