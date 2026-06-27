import type { Session, SessionPracticalContext } from '@/app/core/types/session';
import type {
    PrepareAssignmentFromLessonPlanResponse,
    PreparedAssignmentsForLessonPlanResponse,
} from '@/app/core/types/assignments';

export type LessonPlanStatus =
    | 'DRAFT'
    | 'GENERATED'
    | 'REVIEWED'
    | 'SCHEDULED'
    | 'USED'
    | 'ARCHIVED';

export interface LessonPlanQueryParams {
    search?: string;
    status?: LessonPlanStatus;
    term?: number;
    cohort_subject?: number;
    subject?: number;
    cohort?: number;
    session?: number;
    page?: number;
    page_size?: number;
    ordering?: string;
}

export interface PlannedOutcome {
    plugin: string;
    outcome_id: number;
    code: string;
    text: string;
    strand: string;
    sub_strand: string;
    strand_id?: number;
    sub_strand_id?: number;
    subject_profile_id?: number | null;
    status?: 'TAUGHT' | 'PARTIALLY_TAUGHT' | 'NOT_TAUGHT';
}

export interface ReferencePageInput {
    resource_title: string;
    author?: string;
    publisher?: string;
    edition?: string;
    year?: number | null;
    resource_type?: string;
    chapter?: string;
    topic_label?: string;
    page_start: number | '';
    page_end: number | '';
    notes?: string;
    keywords?: string[];
    strand_id?: number | null;
    strand_name?: string;
    sub_strand_id?: number | null;
    sub_strand_name?: string;
    outcome_id?: number | null;
    outcome_code?: string;
}

export interface ReferencePagePayload extends Omit<ReferencePageInput, 'page_start' | 'page_end'> {
    page_start: number;
    page_end: number;
}

export interface LessonPlanReferenceRecord {
    id: number;
    lesson_plan: number;
    reference_entry: number;
    reference_citation: string;
    resource_title: string;
    author?: string;
    publisher?: string;
    edition?: string;
    year?: number | null;
    resource_type?: string;
    chapter: string;
    topic_label: string;
    page_start: number;
    page_end: number;
    notes: string;
    keywords: string[];
    strand_id?: number | null;
    strand_name?: string;
    sub_strand_id?: number | null;
    sub_strand_name?: string;
    outcome_id?: number | null;
    outcome_code?: string;
    selected_by_ai: boolean;
    ai_reason: string;
    confidence: number;
    citation_snapshot: string;
    created_at: string;
}

export interface LessonPlan {
    id: number;
    organization: number | null;
    session: number | null;
    session_title: string | null;
    session_date: string | null;
    cohort_subject: number | null;
    cohort_subject_name: string | null;
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
    planned_outcomes: PlannedOutcome[];
    planned_date: string | null;
    planned_start_time: string | null;
    planned_end_time: string | null;
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
    references_snapshot: Array<Record<string, unknown>>;
    generated_by_ai: boolean;
    ai_provider: string | null;
    ai_model: string | null;
    ai_fallback_reason: string | null;
    generated_at: string | null;
    reviewed_at: string | null;
    used_at: string | null;
    selected_references: LessonPlanReferenceRecord[];
    created_at: string;
    updated_at: string;
}

export interface LessonPlanCreatePayload {
    cohort_subject: number;
    term: number;
    title: string;
    planned_outcomes: PlannedOutcome[];
    planned_date?: string | null;
    planned_start_time?: string | null;
    planned_end_time?: string | null;
    reference_pages: ReferencePagePayload[];
}

export interface LessonPlanUpdatePayload {
    title?: string;
    planned_outcomes?: PlannedOutcome[];
    planned_date?: string | null;
    planned_start_time?: string | null;
    planned_end_time?: string | null;
    objectives?: string[];
    prior_knowledge?: string;
    learning_resources?: string[];
    introduction?: string;
    lesson_development?: string;
    learner_activities?: string;
    assessment_strategy?: string;
    differentiation?: string;
    conclusion?: string;
    reference_pages?: ReferencePagePayload[];
}

export interface GenerateLessonPlanPayload {
    force_regenerate?: boolean;
    use_ai?: boolean;
}

export interface GenerateLessonPlanFromSessionPayload {
    session_id: number;
    force_regenerate?: boolean;
    use_ai?: boolean;
}

export interface GenerateLessonPlanResponse {
    detail: string;
    created: boolean;
    selected_references_count: number;
    lesson_plan: LessonPlan;
}

export type ScheduleLessonSessionType =
    | 'LESSON'
    | 'PRACTICAL'
    | 'PROJECT'
    | 'EXAM'
    | 'FIELD_TRIP'
    | 'ASSEMBLY'
    | 'OTHER';

export const SCHEDULE_LESSON_SESSION_TYPE_OPTIONS: Array<{
    value: ScheduleLessonSessionType;
    label: string;
}> = [
    { value: 'LESSON', label: 'Lesson' },
    { value: 'PRACTICAL', label: 'Practical' },
    { value: 'PROJECT', label: 'Project' },
    { value: 'EXAM', label: 'Exam' },
    { value: 'FIELD_TRIP', label: 'Field Trip' },
    { value: 'ASSEMBLY', label: 'Assembly' },
    { value: 'OTHER', label: 'Other' },
];

export interface ScheduleLessonPayload {
    session_date: string;
    start_time: string;
    end_time: string;
    session_type?: ScheduleLessonSessionType;
    venue?: string;
    description?: string;
    participating_cohort_subject_ids?: number[];
    practical_context?: SessionPracticalContext;
}

export interface ScheduleLessonFormData extends ScheduleLessonPayload {
    session_type: ScheduleLessonSessionType;
    venue: string;
    description: string;
    participating_cohort_subject_ids: number[];
}

export interface ScheduleLessonResponse {
    detail: string;
    lesson_plan: LessonPlan;
    session: Session;
}

export interface AvailableLessonPlanParticipatingCohortSubject {
    cohort_subject_id: number;
    cohort_id: number;
    cohort_name: string;
    cohort_level: string;
    academic_year: string | null;
    subject_id: number;
    subject_name: string;
    learner_count: number;
}

export interface AvailableLessonPlanParticipatingCohortsResponse {
    lesson_plan_id: number;
    source_cohort_subject: number | null;
    source_cohort_name: string | null;
    source_cohort_level: string | null;
    source_learner_count: number;
    subject: number | null;
    subject_name: string | null;
    results: AvailableLessonPlanParticipatingCohortSubject[];
}

export type LessonPlanAssignmentDraftResponse = PrepareAssignmentFromLessonPlanResponse;
export type LessonPlanPreparedAssignmentsResponse = PreparedAssignmentsForLessonPlanResponse;

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
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'USED', label: 'Used' },
    { value: 'ARCHIVED', label: 'Archived' },
];

export function canMarkLessonPlanReviewed(status: LessonPlanStatus): boolean {
    return status === 'GENERATED';
}

export function canScheduleLesson(status: LessonPlanStatus): boolean {
    return status === 'GENERATED' || status === 'REVIEWED';
}

export function canPrepareAssignmentDraft(status: LessonPlanStatus): boolean {
    return status === 'GENERATED' || status === 'REVIEWED' || status === 'SCHEDULED';
}

export function canMarkLessonPlanUsed(status: LessonPlanStatus): boolean {
    switch (status) {
        case 'DRAFT':
        case 'GENERATED':
        case 'REVIEWED':
        case 'SCHEDULED':
        case 'USED':
        case 'ARCHIVED':
        default:
            return false;
    }
}

export function canArchiveLessonPlan(status: LessonPlanStatus): boolean {
    return status !== 'ARCHIVED';
}

export function canRestoreLessonPlan(status: LessonPlanStatus): boolean {
    return status === 'ARCHIVED';
}
