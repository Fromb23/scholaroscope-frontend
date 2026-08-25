'use client';

import { BookOpen, Calendar, ClipboardList } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { AssessmentPolicyPreviewCard } from '@/app/core/components/assessments/AssessmentPolicyPreviewCard';
import {
    AssessmentGovernance,
    getAssessmentObjectiveText,
    type AssessmentDetail,
} from '@/app/core/types/assessment';

export function AssessmentInfoCard({ assessment }: { assessment: AssessmentDetail }) {
    const isQuickAssessment = assessment.governance === AssessmentGovernance.FORMATIVE;
    const objectiveText = getAssessmentObjectiveText(assessment);

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                        {assessment.assessment_date
                            ? new Date(assessment.assessment_date).toLocaleDateString()
                            : 'Date not set'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <BookOpen className="h-4 w-4 shrink-0 text-gray-400" />
                        {assessment.term_name ?? 'Year-round'}
                    </div>
                    {assessment.total_marks && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <ClipboardList className="h-4 w-4 shrink-0 text-gray-400" />
                            Total marks: {assessment.total_marks}
                        </div>
                    )}
                    {assessment.description && (
                        <p className="w-full border-t border-gray-100 pt-3 text-sm text-gray-600">
                            {assessment.description}
                        </p>
                    )}
                    {isQuickAssessment && objectiveText ? (
                        <div className="w-full border-t border-gray-100 pt-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Learning objective
                            </p>
                            <p className="mt-1 text-sm text-gray-700">{objectiveText}</p>
                        </div>
                    ) : null}
                    {isQuickAssessment ? (
                        <p className="w-full rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                            This assessment does not affect official school report grades.
                        </p>
                    ) : null}
                </div>
            </Card>

            {!isQuickAssessment ? (
                <AssessmentPolicyPreviewCard
                    cohortId={assessment.cohort_id}
                    cohortSubjectId={assessment.cohort_subject}
                    termId={assessment.term}
                    assessmentContext={{
                        cohort_name: assessment.cohort_name,
                        subject_id: assessment.subject_id,
                        subject_name: assessment.subject_name,
                        subject_code: assessment.subject_code,
                        curriculum_id: assessment.curriculum_id,
                        curriculum_name: assessment.curriculum_name,
                        curriculum_type: assessment.curriculum_type,
                        cohort_curriculum_type: assessment.cohort_curriculum_type,
                        subject_curriculum_type: assessment.subject_curriculum_type,
                        subject_source: assessment.subject_source,
                        teaching_link_id: assessment.teaching_link_id,
                        cbc_cohort_subject_id: assessment.cbc_cohort_subject_id,
                        subject_profile_id: assessment.subject_profile_id,
                    }}
                />
            ) : null}
        </div>
    );
}
