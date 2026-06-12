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

export interface SchemeRequirementStatus {
    applies: boolean;
    organization_enabled: boolean;
    assignment_enabled: boolean;
    required_teacher_id: number | null;
    required_teacher_name: string;
    scheme_exists: boolean;
    scheme_id: number | null;
    source: string | null;
    message: string;
}

export interface LessonPlanCurriculumContext {
    cohort_subject: number;
    curriculum_type: string | null;
    provider: string;
    ai_generation_available: boolean;
    supports_outcome_selection: boolean;
    supports_reference_alignment: boolean;
    manual_outcomes_allowed: boolean;
    outcome_source: string;
    reference_language: LessonPlanReferenceLanguage;
    scheme_requirement: SchemeRequirementStatus;
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
