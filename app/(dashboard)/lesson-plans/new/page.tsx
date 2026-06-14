import { TeachingRecordAccessGate } from '@/app/core/components/workspaces/TeachingRecordAccessGate';
import { GenerateLessonPlanPage } from '@/app/core/components/lessonPlans/GenerateLessonPlanPage';

export default function Page() {
    return (
        <TeachingRecordAccessGate
            backHref="/lesson-plans"
            backLabel="Back to Lesson Plans"
            title="Plan a lesson"
        >
            <GenerateLessonPlanPage />
        </TeachingRecordAccessGate>
    );
}
