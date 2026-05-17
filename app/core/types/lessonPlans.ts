export type LessonPlanStatus =
    | 'DRAFT'
    | 'GENERATED'
    | 'REVIEWED'
    | 'USED'
    | 'ARCHIVED';

export interface LessonPlanQueryParams {
    search?: string;
    status?: LessonPlanStatus;
    term?: number;
    subject?: number;
    cohort?: number;
    session?: number;
    page?: number;
    page_size?: number;
    ordering?: string;
}

export interface LessonPlanReferenceRecord {
    [key: string]: unknown;
}

export interface LessonPlan {
    id: number;
    organization: number | null;
    session: number;
    session_title: string | null;
    session_date: string | null;
    teacher: number | null;
    teacher_name: string | null;
    cohort: number | null;
    cohort_name: string | null;
    subject: number | null;
    subject_name: string | null;
    curriculum: number | null;
    curriculum_name: string | null;
    term: number | null;
    term_name: string | null;
    academic_year: number | null;
    academic_year_name: string | null;
    title: string;
    status: LessonPlanStatus;
    objectives: string[];
    prior_knowledge: string | null;
    learning_resources: string[];
    introduction: string | null;
    lesson_development: string | null;
    learner_activities: string | null;
    assessment_strategy: string | null;
    differentiation: string | null;
    conclusion: string | null;
    reflection: string | null;
    generated_context: Record<string, unknown> | null;
    references_snapshot: unknown[];
    generated_by_ai: boolean;
    ai_provider: string | null;
    ai_model: string | null;
    generated_at: string | null;
    reviewed_at: string | null;
    used_at: string | null;
    selected_references: unknown[] | null;
    created_at: string;
    updated_at: string;
}

export interface LessonPlanCreatePayload {
    session: number;
    title: string;
    objectives: string[];
    prior_knowledge: string;
    learning_resources: string[];
    introduction: string;
    lesson_development: string;
    learner_activities: string;
    assessment_strategy: string;
    differentiation: string;
    conclusion: string;
    reflection: string;
}

export type LessonPlanUpdatePayload = Partial<LessonPlanCreatePayload>;

export interface GenerateLessonPlanPayload {
    session_id: number;
    force_regenerate: boolean;
    use_ai: boolean;
}

export interface GenerateLessonPlanResponse {
    detail: string;
    created: boolean;
    selected_references_count: number;
    lesson_plan: LessonPlan;
}

export interface MarkUsedPayload {
    reflection: string;
}

export const LESSON_PLAN_STATUS_OPTIONS: Array<{
    value: LessonPlanStatus;
    label: string;
}> = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'GENERATED', label: 'Generated' },
    { value: 'REVIEWED', label: 'Reviewed' },
    { value: 'USED', label: 'Used' },
    { value: 'ARCHIVED', label: 'Archived' },
];

export function canMarkLessonPlanReviewed(status: LessonPlanStatus): boolean {
    return status === 'DRAFT' || status === 'GENERATED';
}

export function canMarkLessonPlanUsed(status: LessonPlanStatus): boolean {
    return status === 'DRAFT' || status === 'GENERATED' || status === 'REVIEWED';
}

export function canArchiveLessonPlan(status: LessonPlanStatus): boolean {
    return status !== 'ARCHIVED';
}

export function canRestoreLessonPlan(status: LessonPlanStatus): boolean {
    return status === 'ARCHIVED';
}
