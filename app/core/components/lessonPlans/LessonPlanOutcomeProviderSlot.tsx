'use client';

import { Card } from '@/app/components/ui/Card';
import { getLessonPlanOutcomeProvider } from '@/app/core/registry/lessonPlanOutcomeProviders';
import type {
    LessonPlanCurriculumContext,
    LessonPlanReferenceEditorProps,
    LessonPlanOutcomeSelectorProps,
} from '@/app/core/types/lessonPlanCurriculum';

interface LessonPlanOutcomeProviderSlotProps {
    cohortSubjectId: number;
    context: LessonPlanCurriculumContext;
    plannedOutcomes: LessonPlanOutcomeSelectorProps['value'];
    onPlannedOutcomesChange: LessonPlanOutcomeSelectorProps['onChange'];
    referencePages: LessonPlanReferenceEditorProps['value'];
    onReferencePagesChange: LessonPlanReferenceEditorProps['onChange'];
}

export function LessonPlanOutcomeProviderSlot({
    cohortSubjectId,
    context,
    plannedOutcomes,
    onPlannedOutcomesChange,
    referencePages,
    onReferencePagesChange,
}: LessonPlanOutcomeProviderSlotProps) {
    const provider = getLessonPlanOutcomeProvider(context.provider);

    if (!provider || !context.supports_outcome_selection) {
        return (
            <Card>
                <p className="text-sm text-gray-700">
                    Lesson planning is not configured for this curriculum yet.
                </p>
            </Card>
        );
    }

    const OutcomeSelector = provider.OutcomeSelector;
    const ReferenceEditor = provider.ReferenceEditor;

    return (
        <>
            <OutcomeSelector
                cohortSubjectId={cohortSubjectId}
                context={context}
                value={plannedOutcomes}
                onChange={onPlannedOutcomesChange}
            />
            {ReferenceEditor ? (
                <ReferenceEditor
                    cohortSubjectId={cohortSubjectId}
                    context={context}
                    plannedOutcomes={plannedOutcomes}
                    value={referencePages}
                    onChange={onReferencePagesChange}
                />
            ) : null}
        </>
    );
}
