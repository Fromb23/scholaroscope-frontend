import { TeachingRecordAccessGate } from '@/app/core/components/workspaces/TeachingRecordAccessGate';
import { CreateAssessmentPage } from '@/app/core/components/assessments/CreateAssessmentPage';

export function CreateAssessmentRoutePage() {
    return (
        <TeachingRecordAccessGate
            backHref="/assessments"
            backLabel="Back to Assessments"
            title="Create New Assessment"
        >
            <CreateAssessmentPage />
        </TeachingRecordAccessGate>
    );
}
