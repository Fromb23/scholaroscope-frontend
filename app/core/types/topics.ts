// ============================================================================
// core/types/topics.ts
//
// Topic / Subtopic / Coverage types.
// Mirrors the backend models exactly:
//   Topic           → apps/academic/models.py :: Topic
//   Subtopic        → apps/academic/models.py :: Subtopic
//   TopicSessionLink → apps/academic/models.py :: TopicSessionLink
//   SubtopicCoverage → apps/academic/models.py :: SubtopicCoverage
// ============================================================================

// ── Structural layer ──────────────────────────────────────────────────────

export interface Topic {
    [key: string]: unknown;
    id: number;
    subject: number;
    subject_name: string;
    subject_code: string;
    code: string;
    name: string;
    description: string;
    sequence: number;
    subtopics_count: number;
    created_at: string;
}

export interface TopicDetail extends Topic {
    subtopics: Subtopic[];
}

export interface Subtopic {
    [key: string]: unknown;
    id: number;
    topic: number;
    topic_name: string;
    topic_code: string;
    code: string;
    name: string;
    description: string;
    sequence: number;
    created_at: string;
}

// ── Execution layer ───────────────────────────────────────────────────────

export interface TopicSessionLink {
    id: number;
    session: number;
    subtopic: number;
    subtopic_code: string;
    subtopic_name: string;
    topic_name: string;
    covered: boolean;
    notes: string;
    created_at: string;
}

export interface SubtopicCoverage {
    id: number;
    cohort_subject: number;
    subtopic: number;
    subtopic_code: string;
    subtopic_name: string;
    topic_name: string;
    is_covered: boolean;
    covered_at: string | null;
    updated_at: string;
}

// ── Progress (derived — returned by /subtopic-coverage/progress/) ─────────

export interface CoverageProgress {
    cohort_subject: number;
    subject_name: string;
    covered: number;
    total: number;
    percentage: number;
    uncovered_subtopics: Subtopic[];
    academic_year: number;
    ineligible: boolean;
}

// ── Query param types ─────────────────────────────────────────────────────

export interface TopicQueryParams {
    subject?: number;
    subject__curriculum?: number;
    subject__curriculum__curriculum_type?: string;
    search?: string;
}

export interface SubtopicQueryParams {
    topic?: number;
    topic__subject?: number;
    topic__subject__curriculum?: number;
    search?: string;
    page_size?: number;
}

// ── Form payloads ─────────────────────────────────────────────────────────

export interface TopicFormData {
    subject: number;
    code: string;
    name: string;
    description?: string;
    sequence?: number;
}

export interface SubtopicFormData {
    topic: number;
    code: string;
    name: string;
    description?: string;
    sequence?: number;
}