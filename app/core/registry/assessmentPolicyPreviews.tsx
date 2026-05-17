import type { ReactNode } from 'react';
import type { CohortSubject } from '@/app/core/types/academic';

export type AssessmentPolicyPreviewSubject = CohortSubject & {
    cbc_cohort_subject_id?: number | null;
    subject_profile_id?: number | null;
};

export interface AssessmentPolicyPreviewContext {
    cohortId: number;
    cohortSubjectId: number;
    termId: number | null;
    subject: AssessmentPolicyPreviewSubject;
}

type AssessmentPolicyPreviewRenderer = (context: AssessmentPolicyPreviewContext) => ReactNode;

interface AssessmentPolicyPreviewExtension {
    key: string;
    priority?: number;
    supports: (context: AssessmentPolicyPreviewContext) => boolean;
    render: AssessmentPolicyPreviewRenderer;
}

const _assessmentPolicyPreviewExtensions: AssessmentPolicyPreviewExtension[] = [];

export function registerAssessmentPolicyPreviewExtension(
    extension: AssessmentPolicyPreviewExtension,
): void {
    if (_assessmentPolicyPreviewExtensions.some((entry) => entry.key === extension.key)) return;
    _assessmentPolicyPreviewExtensions.push(extension);
    _assessmentPolicyPreviewExtensions.sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));
}

export function renderAssessmentPolicyPreviewExtension(
    context: AssessmentPolicyPreviewContext,
): ReactNode | null {
    return _assessmentPolicyPreviewExtensions.find((extension) => extension.supports(context))?.render(context) ?? null;
}
