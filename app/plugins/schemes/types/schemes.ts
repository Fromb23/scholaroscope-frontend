// ============================================================================
// types/schemes.ts
// Enhanced Scheme of Work Types with Flexible Term Planning
// ============================================================================

// ============================================================================
// Enums — required by dummy data and components
// ============================================================================

export enum SchemeStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    ARCHIVED = 'ARCHIVED'
}

export enum UnitStatus {
    UNSTARTED = 'UNSTARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    DEFERRED = 'DEFERRED'
}

export enum SessionStatus {
    PLANNED = 'PLANNED',
    EXECUTED = 'EXECUTED',
    MISSED = 'MISSED',
    CANCELLED = 'CANCELLED',
    DEFERRED = 'DEFERRED'
}

export enum CurriculumModel {
    CBC = 'CBC',
    EIGHT_FOUR_FOUR = '8-4-4',
    IGCSE = 'IGCSE',
    CUSTOM = 'CUSTOM'
}

// ============================================================================
// Term Planning Types
// ============================================================================

export interface TermPeriod {
    start_date: string;   // "2026-01-01"
    end_date: string;     // "2026-04-30"
    total_weeks: number;  // Auto-calculated from dates
}

export interface ExamWeek {
    id: string;
    type: 'ENTRY_CAT' | 'MID_TERM' | 'MAIN_EXAM' | 'EXIT_EXAM' | 'CUSTOM';
    week_number: number;       // Which week (1-14)
    duration_weeks: number;    // How many weeks (1-2)
    start_date: string;        // Calculated or adjusted
    end_date: string;          // Calculated or adjusted
    has_teaching: boolean;     // Does teaching happen during this exam period?
    teaching_days?: number[];  // [1,2] = Monday, Tuesday if has_teaching=true
    notes?: string;
}

// ============================================================================
// Scheme Template
// ============================================================================

export interface SchemeTemplate {
    id: number;
    cohort_subject: number;
    cohort_subject_name?: string;
    cohort_name?: string;
    subject_name?: string;
    term: number;
    term_name?: string;
    academic_year?: string;

    // Term Planning
    term_period?: TermPeriod;
    exam_weeks?: ExamWeek[];
    teaching_weeks?: number[];  // Calculated: weeks available for teaching [2,3,4,5,7,8...]

    // Curriculum
    curriculum_model: CurriculumModel | string;
    curriculum_model_ref?: string;

    // Planning config
    week_span?: number;
    lessons_per_week?: number;

    // Status
    status: SchemeStatus | string;

    created_at: string;
    created_by: string;
    updated_at: string;

    // Stats
    total_weeks?: number;
    total_teaching_weeks?: number;
    total_units?: number;
    completed_units?: number;
    total_sessions?: number;
    total_lessons?: number;
    executed_sessions?: number;
    completed_lessons?: number;
    completion_percentage?: number;
}

// ============================================================================
// Scheme Unit (CBC/8-4-4 topic block per week)
// ============================================================================

export interface SchemeUnit {
    id: number;
    template: number;
    sequence_index: number;
    week_number: number;

    // CBC fields
    strand?: string;
    sub_strand?: string;
    learning_outcomes?: string[];

    // 8-4-4 / General fields
    topic?: string;
    objectives?: string[];

    // IGCSE fields
    competencies?: string[];

    // Planning
    expected_sessions: number;
    expected_duration_minutes?: number;
    expected_assessments?: string[];

    // Resources
    resources?: string;
    materials?: string[];
    teaching_aids?: string[];
    references?: string[];
    content_description?: string;

    // Execution
    status: UnitStatus | string;
    actual_sessions?: number;
    started_at?: string;
    completed_at?: string;
    teacher_notes?: string;
}

// ============================================================================
// Weekly Planning Types
// ============================================================================

export interface WeekPlan {
    id: number;
    template: number;
    week_number: number;
    week_start: string;
    week_end: string;

    is_exam_week: boolean;
    exam_week_type?: string;

    lessons_per_week: number;
    lessons: Lesson[];

    status: 'UNSTARTED' | 'IN_PROGRESS' | 'COMPLETED';
    completion_percentage: number;

    created_at: string;
}

// ============================================================================
// Lesson Planning Types
// ============================================================================

export interface Lesson {
    id: number;
    week_plan: number;
    template: number;

    sequence_number: number;

    topic: string;
    sub_topic?: string;

    // CBC specific
    strand?: string;
    sub_strand?: string;
    learning_outcomes?: string[];

    // 8-4-4 specific
    objectives?: string[];

    // IGCSE specific
    competencies?: string[];

    // Resources
    content_description?: string;
    resources?: string[];
    materials?: string[];
    teaching_aids?: string[];
    references?: string[];

    // Session link
    session_id?: number;
    session_status?: SessionStatus | string;

    // Remarks
    remarks?: string;
    teacher_reflection?: string;

    created_at: string;
    updated_at: string;
}

// ============================================================================
// Teaching Session Types
// ============================================================================

export interface TeachingSession {
    id: number;
    scheme_unit?: number;       // Legacy link to SchemeUnit
    lesson_id?: number;         // Direct link to planned lesson
    week_plan_id?: number;
    cohort_subject: number;

    session_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;

    week_number?: number;
    day_of_week?: number;       // 1=Monday, 7=Sunday

    // Content
    topic_covered?: string;
    content_covered?: string;   // Legacy alias
    content_notes?: string;
    activities?: string[];

    // Reflection
    teacher_note?: string;
    what_went_well?: string;
    what_needs_improvement?: string;
    challenges?: string;
    next_steps?: string;

    // Attendance
    attendance_summary?: {
        total_students?: number;
        total?: number;
        present: number;
        absent: number;
        attendance_rate?: number;
        rate?: number;
    };

    assessment_references?: number[];

    status: SessionStatus | string;

    created_at: string;
    updated_at: string;
    created_by?: string;
}

// ============================================================================
// Scheme Timeline
// ============================================================================

export interface SchemeTimeline {
    week_number: number;
    week_start: string;
    week_end: string;
    units: SchemeUnit[];
    sessions: TeachingSession[];
    assessments: unknown[];
    status: 'completed' | 'current' | 'upcoming' | 'exam';
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface SchemeAnalytics {
    template_id: number;

    // Week breakdown
    planned_weeks?: number;
    actual_weeks?: number;
    weeks_ahead_behind?: number;
    total_weeks?: number;
    teaching_weeks?: number;
    exam_weeks?: number;

    // Unit tracking
    total_units?: number;
    completed_units?: number;
    in_progress_units?: number;
    unstarted_units?: number;
    deferred_units?: number;

    // Lesson tracking
    total_lessons_planned?: number;
    lessons_with_sessions?: number;
    lessons_executed?: number;
    lessons_missed?: number;

    // Session tracking
    total_planned_sessions?: number;
    executed_sessions?: number;
    missed_sessions?: number;
    backfilled_sessions?: number;

    // Assessment tracking
    assessments_planned?: number;
    assessments_executed?: number;

    // Performance
    completion_percentage?: number;
    average_attendance_rate?: number;
    average_attendance?: number;
    total_teaching_minutes?: number;
    total_teaching_hours?: number;
    average_session_duration?: number;
}

// ============================================================================
// Scheme Creation Form Types
// ============================================================================

export interface SchemeCreationStep1 {
    cohort_subject: number;
    term: number;
    start_date: string;
    end_date: string;
    curriculum_model: CurriculumModel | string;
}

export interface SchemeCreationStep2 {
    entry_cat_enabled: boolean;
    entry_cat_week?: number;
    entry_cat_duration?: number;
    entry_cat_has_teaching?: boolean;
    entry_cat_teaching_days?: number[];

    mid_term_enabled: boolean;
    mid_term_week?: number;
    mid_term_duration?: number;
    mid_term_has_teaching?: boolean;
    mid_term_teaching_days?: number[];

    main_exam_enabled: boolean;
    main_exam_week?: number;
    main_exam_duration?: number;
    main_exam_has_teaching?: boolean;
    main_exam_teaching_days?: number[];

    exit_exam_enabled: boolean;
    exit_exam_week?: number;
    exit_exam_duration?: number;
    exit_exam_has_teaching?: boolean;
    exit_exam_teaching_days?: number[];
}

export interface SchemeCreationStep3 {
    lessons_per_week: number;
    weekly_lesson_plans: {
        week_number: number;
        lessons: Partial<Lesson>[];
    }[];
}

// ============================================================================
// Composite View Types
// ============================================================================

export interface SchemeWithDetails extends SchemeTemplate {
    // Supports both unit-based and lesson-based structures
    units?: SchemeUnit[];
    week_plans?: WeekPlan[];
    all_lessons?: Lesson[];
    analytics: SchemeAnalytics;
    timeline?: SchemeTimeline[];
}

// ============================================================================
// Helper Constants
// ============================================================================

export const DaysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' }
];

export const ExamTypes = [
    { value: 'ENTRY_CAT', label: 'Entry CAT' },
    { value: 'MID_TERM', label: 'Mid-Term Exam' },
    { value: 'MAIN_EXAM', label: 'Main/End Exam' },
    { value: 'EXIT_EXAM', label: 'Exit Exam' },
    { value: 'CUSTOM', label: 'Custom Exam Period' }
];