import type { ComponentType } from 'react';
import type { PlannedOutcome, ReferencePageInput } from '@/app/core/types/lessonPlans';

export interface LessonPlanReferenceLanguage {
    resource_label: string;
    strand_label?: string;
    sub_strand_label?: string;
    outcome_label?: string;
    pages_label: string;
    chapter_label: string;
    notes_label: string;
    topic_label?: string;
}

export interface LessonPlanCurriculumContext {
    cohort_subject: number;
    curriculum_type: string | null;
    provider: string;
    supports_outcome_selection: boolean;
    supports_reference_alignment: boolean;
    manual_outcomes_allowed: boolean;
    outcome_source: string;
    reference_language: LessonPlanReferenceLanguage;
}

export interface LessonPlanOutcomeSelectorProps {
    cohortSubjectId: number;
    context: LessonPlanCurriculumContext;
    value: PlannedOutcome[];
    onChange: (outcomes: PlannedOutcome[]) => void;
}

export interface LessonPlanReferenceEditorProps {
    cohortSubjectId: number;
    context: LessonPlanCurriculumContext;
    plannedOutcomes: PlannedOutcome[];
    value: ReferencePageInput[];
    onChange: (references: ReferencePageInput[]) => void;
}

export interface LessonPlanOutcomeProviderRegistration {
    provider: string;
    OutcomeSelector: ComponentType<LessonPlanOutcomeSelectorProps>;
    ReferenceEditor?: ComponentType<LessonPlanReferenceEditorProps>;
}
