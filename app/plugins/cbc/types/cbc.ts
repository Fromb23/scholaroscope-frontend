// ============================================================================
// app/types/cbc.ts - CBC Types
// ============================================================================

// ============================================================================
// Structural layer
// ============================================================================

export interface Strand {
  id: number;
  curriculum: number;
  curriculum_name: string;
  subject: number | null;
  subject_name: string | null;
  code: string;
  name: string;
  description: string;
  sequence: number;
  sub_strands_count: number;
}

export interface StrandDetail extends Strand {
  sub_strands: SubStrand[];
}

export interface SubStrand {
  id: number;
  strand: number;
  strand_name: string;
  code: string;
  name: string;
  description: string;
  sequence: number;
  outcomes_count: number;
}

export interface SubStrandDetail extends SubStrand {
  learning_outcomes: LearningOutcome[];
}

export interface LearningOutcome {
  id: number;
  sub_strand: number;
  sub_strand_name: string;
  strand_name: string;
  grade: number | null;
  grade_name: string | null;
  code: string;
  description: string;
  level: string;
  evidence_count: number;
  created_at: string;
}

// ============================================================================
// Evidence layer
// ============================================================================

export type SourceType = 'ASSESSMENT' | 'SESSION' | 'PROJECT' | 'OTHER';
export type EvaluationType = 'NUMERIC' | 'RUBRIC' | 'DESCRIPTIVE' | 'COMPETENCY';

export interface EvidenceRecord {
  id: number;
  student: number;
  student_name: string;
  student_admission: string;
  learning_outcome: number;
  learning_outcome_code: string;
  learning_outcome_description: string;
  strand_name: string;
  sub_strand_name: string;
  source_type: SourceType;
  source_type_display: string;
  source_id: number | null;
  evaluation_type: EvaluationType;
  evaluation_type_display: string;
  numeric_score: number | null;
  rubric_level: number | null;
  rubric_level_label: string | null;
  narrative: string;
  observed_at: string;
  recorded_at: string;
  recorded_by: string;
  created_at: string;
}

export interface EvidenceFormData {
  student: number;
  learning_outcome: number;
  source_type: SourceType;
  source_id?: number | null;
  evaluation_type: EvaluationType;
  numeric_score?: number | null;
  rubric_level?: number | null;
  narrative?: string;
  observed_at: string;
  recorded_by: string;
}

export interface BulkEvidenceData {
  learning_outcome: number;
  evidence_records: Array<{
    student_id: number;
    evaluation_type: string;
    numeric_score?: number;
    rubric_level_id?: number;
    narrative?: string;
  }>;
  source_type: SourceType;
  source_id?: number | null;
  observed_at: string;
  recorded_by: string;
}

// ============================================================================
// Legacy progress shapes (evidenceAPI actions — kept for compatibility)
// ============================================================================

export interface StudentProgress {
  student: {
    id: number;
    name: string;
    admission_number: string;
  };
  strand_progress: Array<{
    strand_code: string;
    strand_name: string;
    total_outcomes: number;
    evidenced_outcomes: number;
    completion_percentage: number;
  }>;
  overall_completion: number;
  total_outcomes: number;
  total_evidenced: number;
}

export interface OutcomeAchievement {
  total_students_evidenced: number;
  total_evidence_records: number;
  rubric_distribution: Array<{
    rubric_level__code: string;
    rubric_level__label: string;
    count: number;
  }>;
}

export interface ClassProgress {
  student_id: number;
  student_name: string;
  admission_number: string;
  evidenced_outcomes: number;
  total_outcomes: number;
  completion_percentage: number;
}

// ============================================================================
// Structural form data
// ============================================================================

export interface StrandFormData {
  curriculum: number;
  subject?: number | null;
  code: string;
  name: string;
  description?: string;
  sequence: number;
}

export interface SubStrandFormData {
  strand: number;
  code: string;
  name: string;
  description?: string;
  sequence: number;
}

export interface LearningOutcomeFormData {
  sub_strand: number;
  grade?: number | null;
  code: string;
  description: string;
  level?: string;
}

// ============================================================================
// OutcomeSession — session ↔ outcome link (delivery layer)
// ============================================================================

export interface OutcomeSession {
  id: number;
  session: number;
  learning_outcome: number;
  learning_outcome_code: string;
  learning_outcome_description: string;
  sub_strand_name: string;
  strand_name: string;
  covered: boolean;
  notes: string;
  created_at: string;
}

export interface OutcomeSessionFormData {
  session: number;
  learning_outcome: number;
  covered?: boolean;
  notes?: string;
}

export interface BulkOutcomeSessionData {
  session: number;
  learning_outcome_ids: number[];
}

// ============================================================================
// OutcomeProgress — cached mastery state (progress layer)
// ============================================================================

export type MasteryLevel = 'NOT_STARTED' | 'EMERGING' | 'MEETING' | 'EXCEEDING';

export interface OutcomeProgress {
  id: number;
  student: number;
  student_name: string;
  student_admission: string;
  learning_outcome: number;
  learning_outcome_code: string;
  mastery_level: MasteryLevel;
  mastery_level_display: string;
  evidence_count: number;
  last_evaluated_at: string | null;
  updated_at: string;
}

export interface OutcomeProgressUpdateData {
  mastery_level: MasteryLevel;
  last_evaluated_at?: string | null;
}

export interface BulkOutcomeProgressData {
  student: number;
  updates: Array<{
    learning_outcome: number;
    mastery_level: MasteryLevel;
  }>;
}

// ============================================================================
// Summary response shapes (OutcomeProgress custom actions)
// ============================================================================

export interface MasteryDistribution {
  NOT_STARTED: number;
  EMERGING: number;
  MEETING: number;
  EXCEEDING: number;
}

export interface StrandMasterySummary {
  strand_code: string;
  strand_name: string;
  total_outcomes: number;
  mastery_distribution: MasteryDistribution;
  mastered_count: number;
  completion_percentage: number;
}

export interface StudentProgressSummary {
  student: {
    id: number;
    name: string;
    admission_number: string;
  };
  strand_summary: StrandMasterySummary[];
  total_outcomes: number;
  total_mastered: number;
  overall_mastery_percentage: number;
}

export interface CohortSummaryEntry {
  student_id: number;
  student_name: string;
  admission_number: string;
  mastered_outcomes: number;
  total_outcomes: number;
  mastery_percentage: number;
}

// Teaching Session (extends base Session type)
export interface TeachingSession {
  session_date: string;
  id: number;
  cohort: number;
  cohort_name: string;
  subject: number | null;
  subject_name: string | null;
  teacher: number;
  teacher_name: string;
  date: string;
  title: string;
  notes: string;
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  outcome_links_count: number;
  created_at: string;
  updated_at: string;
}

// Session summary for teaching dashboard
export interface TeachingSessionSummary {
  session_id: number;
  date: string;
  cohort: string | null;
  subject: string | null;
  outcomes: {
    total: number;
    covered: number;
    pending: number;
  };
  evidence: {
    total_records: number;
    students_with_evidence: number;
  };
}

// Extended OutcomeSession with evidence count
export interface OutcomeSessionWithEvidence extends OutcomeSession {
  evidence_count: number;
}

// Learner with session-specific evidence count
export interface SessionLearner {
  id: number;
  admission_number: string;
  first_name: string;
  last_name: string;
  session_evidence_count: number;
}
