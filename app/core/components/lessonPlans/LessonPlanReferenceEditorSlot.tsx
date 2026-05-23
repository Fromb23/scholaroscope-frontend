'use client';

import { Card } from '@/app/components/ui/Card';
import { GenericReferencePagesEditor } from '@/app/core/components/lessonPlans/GenericReferencePagesEditor';
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
        return (
            <Card>
                <p className="text-sm text-amber-700">
                    Reference editing is unavailable because this curriculum context does not support reference alignment.
                </p>
            </Card>
        );
    }

    const provider = getLessonPlanOutcomeProvider(context.provider);
    const ReferenceEditor = provider?.ReferenceEditor;

    if (!ReferenceEditor) {
        return (
            <GenericReferencePagesEditor
                cohortSubjectId={cohortSubjectId}
                context={context}
                plannedOutcomes={plannedOutcomes}
                value={referencePages}
                onChange={onReferencePagesChange}
            />
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
