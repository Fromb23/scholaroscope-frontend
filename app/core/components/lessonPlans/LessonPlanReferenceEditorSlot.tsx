'use client';

import { Card } from '@/app/components/ui/Card';
import { getLessonPlanOutcomeProvider } from '@/app/core/registry/lessonPlanOutcomeProviders';
import type { LessonPlanReferenceEditorProps } from '@/app/core/types/lessonPlanCurriculum';

interface LessonPlanReferenceEditorSlotProps {
    cohortSubjectId: number;
    context: LessonPlanReferenceEditorProps['context'];
    plannedOutcomes: LessonPlanReferenceEditorProps['plannedOutcomes'];
    referencePages: LessonPlanReferenceEditorProps['value'];
    onReferencePagesChange: LessonPlanReferenceEditorProps['onChange'];
}

export function LessonPlanReferenceEditorSlot({
    cohortSubjectId,
    context,
    plannedOutcomes,
    referencePages,
    onReferencePagesChange,
}: LessonPlanReferenceEditorSlotProps) {
    if (!context.supports_reference_alignment) {
        return null;
    }

    const provider = getLessonPlanOutcomeProvider(context.provider);
    const ReferenceEditor = provider?.ReferenceEditor;

    if (!ReferenceEditor) {
        return (
            <Card>
                <p className="text-sm text-gray-700">
                    Reference editing is not configured for this curriculum yet.
                </p>
            </Card>
        );
    }

    return (
        <ReferenceEditor
            cohortSubjectId={cohortSubjectId}
            context={context}
            plannedOutcomes={plannedOutcomes}
            value={referencePages}
            onChange={onReferencePagesChange}
        />
    );
}
