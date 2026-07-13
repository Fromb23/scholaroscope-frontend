import type { PaginatedResponse } from '@/app/core/types/api';
import type { OperationalScope } from '@/app/core/lib/academicScope';

export type SchemeStatus = 'DRAFT' | 'GENERATED';
export type SchemeGenerationMode = 'AI_ASSISTED_DRAFT' | 'MANUAL_DRAFT';
export type SchemeWeekType =
    | 'TEACHING'
    | 'MIDTERM_BREAK'
    | 'MIDTERM_EXAM'
    | 'ENTRY_EXAM'
    | 'EXIT_EXAM'
    | 'HOLIDAY'
    | 'OTHER';

export interface ExceptionalWeekInput {
    week_number: number;
    week_type: SchemeWeekType;
    affects_learning: boolean;
    notes?: string;
    label?: string;
}

export interface SchemeNonBlockingExamNotes {
    entry_exam_available?: boolean;
    entry_exam_affects_learning?: boolean;
    exit_exam_available?: boolean;
    exit_exam_affects_learning?: boolean;
}

export interface CurriculumRangeInput {
    start_strand_id: number;
    start_substrand_id: number;
    end_strand_id: number;
    end_substrand_id: number;
}

export interface GenerateSchemePayload {
    term: number;
    cohort_subject: number;
    teacher?: number;
    title?: string;
    lessons_per_week: number;
    lesson_duration_minutes?: number;
    curriculum_range: CurriculumRangeInput;
    generation_mode?: SchemeGenerationMode;
}

export interface SchemeEntry {
    id: number;
    scheme: number;
    week: number;
    week_number: number;
    week_type: SchemeWeekType;
    week_type_display: string;
    week_label: string;
    lesson: number;
    strand: string;
    sub_strand: string;
    lesson_learning_outcomes: string;
    learning_experiences: string;
    key_inquiry_questions: string;
    learning_resources: string;
    assessment_methods: string;
    reflection: string;
    curriculum_metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface SchemeWeek {
    id: number;
    scheme: number;
    week_number: number;
    week_type: SchemeWeekType;
    week_type_display: string;
    label: string;
    notes: string;
    affects_learning: boolean;
    is_exceptional: boolean;
    is_active_learning_week: boolean;
    entries_count: number;
}

export interface SchemeOfWork {
    id: number;
    cohort_subject: number | null;
    teacher: number | null;
    teacher_name: string;
    cohort: number | null;
    cohort_name: string;
    subject: number | null;
    subject_name: string;
    curriculum: number | null;
    curriculum_name: string;
    term: number | null;
    term_name: string;
    academic_year: number | null;
    academic_year_name: string;
    level_label: string;
    title: string;
    status: SchemeStatus;
    status_display: string;
    generation_mode: SchemeGenerationMode;
    lessons_per_week: number;
    lesson_duration_minutes: number;
    non_blocking_exam_notes: SchemeNonBlockingExamNotes;
    curriculum_range: Partial<CurriculumRangeInput>;
    generation_context: Record<string, unknown>;
    generated_by_ai: boolean;
    ai_provider: string;
    ai_model: string;
    generated_at: string | null;
    is_historical: boolean;
    read_only_reason: string;
    term_week_count: number;
    active_learning_week_count: number;
    exceptional_week_count: number;
    total_lesson_slots?: number;
    entries_count: number;
    created_at: string;
    updated_at: string;
    entries?: SchemeEntry[];
}

export type SchemeComplianceStatus =
    | 'COMPLETE'
    | 'PARTIAL'
    | 'MISSING'
    | 'NEEDS_REVIEW'
    | 'NOT_EXPECTED';

export interface SchemeComplianceSummary {
    total_instructors: number;
    complete: number;
    partial: number;
    missing: number;
    needs_review: number;
}

export interface SchemeComplianceRow {
    instructor_id: number;
    instructor_name: string;
    instructor_email: string;
    subjects: Array<{ id: number | null; name: string }>;
    cohorts: Array<{ id: number | null; name: string }>;
    expected: number;
    submitted: number;
    generated: number;
    draft: number;
    missing: number;
    needs_review: number;
    compliance_percentage: number;
    status: SchemeComplianceStatus;
    status_label: string;
}

export interface SchemeComplianceResponse {
    term: {
        id: number;
        name: string;
    };
    summary: SchemeComplianceSummary;
    results: SchemeComplianceRow[];
    pagination: {
        count: number;
        next: number | null;
        previous: number | null;
    };
}

export interface SchemeComplianceQueryParams {
    term_id: number | string;
    subject_id?: number | string;
    cohort_id?: number | string;
    search?: string;
    compliance?: SchemeComplianceStatus | '';
    page?: number;
    page_size?: number;
    ordering?: string;
}

export interface InstructorSchemeDrilldownItem {
    id: number;
    title: string;
    cohort_subject_id: number | null;
    status: SchemeStatus;
    status_label: string;
    calendar_needs_review: boolean;
    calendar_review_reason: string;
    term: {
        id: number;
        name: string;
        start_date: string;
        end_date: string;
    } | null;
    cohort: { id: number | null; name: string } | null;
    subject: { id: number | null; name: string } | null;
    updated_at: string | null;
    generated_at: string | null;
}

export interface InstructorSchemeDrilldown {
    instructor: {
        id: number;
        name: string;
        email: string;
    };
    total: number;
    results: InstructorSchemeDrilldownItem[];
}

export interface SchemeListQueryParams {
    scope?: OperationalScope;
    term?: number | string;
    teacher?: number | string;
    cohort_subject?: number | string;
    subject?: number | string;
    curriculum?: number | string;
    status?: SchemeStatus;
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
}

export interface SchemeUpdatePayload {
    title: string;
}

export interface SchemeWeekUpdatePayload {
    week_type?: SchemeWeekType;
    label?: string;
    notes?: string;
    affects_learning?: boolean;
}

export interface SchemeEntryUpdatePayload {
    learning_experiences?: string;
    key_inquiry_questions?: string;
    learning_resources?: string;
    assessment_methods?: string;
    reflection?: string;
}

export interface SchemeExportResponse {
    blob: Blob;
    fileName: string;
}

export interface SchemeSubjectSubStrandOption {
    id: number;
    name: string;
    code?: string;
    sequence?: number;
}

export interface SchemeSubjectStrandOption {
    id: number;
    name: string;
    code?: string;
    sequence?: number;
    sub_strands: SchemeSubjectSubStrandOption[];
}

export type SchemeListResponse =
    | SchemeOfWork[]
    | PaginatedResponse<SchemeOfWork>;
