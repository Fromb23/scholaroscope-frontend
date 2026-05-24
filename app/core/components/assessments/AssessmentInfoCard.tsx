'use client';

import { BookOpen, Calendar, ClipboardList } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { AssessmentPolicyPreviewCard } from '@/app/core/components/assessments/AssessmentPolicyPreviewCard';
import type { AssessmentDetail } from '@/app/core/types/assessment';

export function AssessmentInfoCard({ assessment }: { assessment: AssessmentDetail }) {
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
                </div>
            </Card>

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
        </div>
    );
}
