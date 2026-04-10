// app/plugins/cbc/types/cbc.ts
// Aligned to backend after service layer refactor.
// Removed: recorded_by (dropped from all serializers)
//          code/sequence from form types (server-generated)
//          learning_outcome_ids → outcome_ids
//          TeachingSession fields that don't exist on Session model

// ============================================================================
// Structural layer
// ============================================================================

export interface Strand {
  id: number;
  curriculum: number;
  curriculum_name: string;
  subject: number | null;
  subject_name: string | null;
  code: string;             // read-only — server generated
  name: string;
  description: string;
  sequence: number;         // read-only — server generated
  sub_strands_count: number;
}

export interface StrandDetail extends Strand {
  sub_strands: SubStrand[];
}

export interface SubStrand {
  id: number;
  strand: number;
  strand_name: string;
  code: string;             // read-only — server generated
  name: string;
  description: string;
  sequence: number;         // read-only — server generated
  outcomes_count: number;
}

export interface SubStrandDetail extends SubStrand {
  learning_outcomes: LearningOutcome[];
  subject_level: string | null;
}

export interface LearningOutcome {
  id: number;
  sub_strand: number;
  sub_strand_name: string;
  strand_name: string;
  grade: number | null;
  grade_name: string | null;
  code: string;             // read-only — server generated
  description: string;
  level: string;
  evidence_count: number;
  created_at: string;
}

// ============================================================================
// Form data — code + sequence intentionally absent (server-generated)
// ============================================================================

export interface StrandFormData {
  curriculum: number;
  subject?: number | null;
  name: string;
  description?: string;
}

export interface SubStrandFormData {
  strand: number;
  name: string;
  description?: string;
}

export interface LearningOutcomeFormData {
  sub_strand: number;
  grade?: number | null;
  description: string;
  level?: string;
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
  recorded_by: number | null;   // FK id — never sent from client
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
  // recorded_by intentionally absent — injected from request.user on server
}

export interface BulkEvidenceData {
  learning_outcome: number;
  evidence_records: Array<{
    student_id: number;
    evaluation_type: EvaluationType;
    numeric_score?: number;
    rubric_level_id?: number;
    narrative?: string;
  }>;
  source_type: SourceType;
  source_id?: number | null;
  observed_at: string;
  // recorded_by intentionally absent
}

// ============================================================================
// Progress shapes — evidenceAPI actions
// ============================================================================

export interface StudentProgress {
  student: { id: number; name: string; admission_number: string };
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
// OutcomeSession
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

export interface OutcomeSessionWithEvidence extends OutcomeSession {
  evidence_count: number;
}

export interface OutcomeSessionFormData {
  session: number;
  learning_outcome: number;
  covered?: boolean;
  notes?: string;
}

export interface BulkOutcomeSessionData {
  session: number;
  outcome_ids: number[];    // was learning_outcome_ids — renamed in serializer patch
}

// ============================================================================
// OutcomeProgress
// ============================================================================


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
  updates: Array<{ learning_outcome: number; mastery_level: MasteryLevel }>;
}

// ============================================================================
// Summary shapes
// ============================================================================

export interface MasteryDistribution {
  NOT_STARTED: number;
  BELOW: number;
  APPROACHING: number;
  MEETING: number;
  EXCEEDING: number;
}
export type CompetencyDistribution = MasteryDistribution;

export interface StrandMasterySummary {
  strand_code: string;
  strand_name: string;
  total_outcomes: number;
  mastery_distribution: MasteryDistribution;
  mastered_count: number;
  completion_percentage: number;
}

export interface StudentProgressSummary {
  student: { id: number; name: string; admission_number: string };
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

// ============================================================================
// TeachingSession — aligned to actual Session model fields
// ============================================================================

export type SessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';

export interface TeachingSession {
  id: number;
  cohort_subject: number;
  cohort_name: string;
  subject_name: string | null;
  organization: number;
  session_type: string;
  status: SessionStatus;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string;
  venue: string;
  created_by: number | null;
  created_at: string;
  outcome_links_count?: number;
  subject_id: number | null;
  cohort_level: string | null;
}

export interface TeachingSessionSummary {
  session_id: number;
  session_date: string;
  cohort: string | null;
  subject: string | null;
  outcomes: { total: number; covered: number; pending: number };
  evidence: { total_records: number; students_with_evidence: number };
}

export interface SessionLearner {
  id: number;
  admission_number: string;
  first_name: string;
  last_name: string;
  session_evidence_count: number;
}

export interface RubricLevel {
  id: number;
  code: string;
  label: string;
  description: string;
  numeric_value: number;
  sequence: number;
}

export interface RubricScale {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  levels: RubricLevel[];
}

export interface StudentEntry {
  student_id: number;
  rubric_level?: number | null;
  narrative?: string;
}

export interface BulkClassEvidenceData {
  learning_outcome: number;
  session_id: number;
  observed_at: string;
  evaluation_type: 'RUBRIC' | 'DESCRIPTIVE';
  default_rubric_level?: number | null;
  default_narrative?: string;
  student_entries: StudentEntry[];
}


export type MasteryLevel =
  | 'NOT_STARTED'
  | 'BELOW'
  | 'APPROACHING'
  | 'MEETING'
  | 'EXCEEDING';


export interface CoverageSummary {
  covered: number;
  total: number;
  percent: number;
}

export interface CBCProgressSummary {
  coverage: CoverageSummary;
  competency: CompetencyDistribution;
  attention_needed: number;
  avg_score: number;
}

export interface StrandOutcomeDistribution {
  outcome_id: number;
  outcome_code: string;
  description: string;
  sub_strand_id: number;
  sub_strand_name: string;
  distribution: CompetencyDistribution;
}

export interface OutcomeLearner {
  student_id: number;
  student_name: string;
  admission_number: string;
  mastery_level: MasteryLevel;
  evidence_count: number;
  last_evaluated_at: string | null;
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface OutcomeConfidence {
  outcome_id: number;
  outcome_code: string;
  mastery_level: MasteryLevel;
  evidence_count: number;
  confidence: ConfidenceLevel;
  source_types: string[];
  has_assessment: boolean;
  has_override: boolean;
}

export interface CBCTeachingAssignment {
  cohort_subject_id: number;
  cohort_id: number;
  cohort_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  level: string;
  academic_year: string;
  is_current_year: boolean;
}

export interface MyCBCTeachingLoad {
  role: 'ADMIN' | 'INSTRUCTOR' | null;
  organization: string | null;
  assignments: CBCTeachingAssignment[];
  total_assigned: number;
}

export interface CBCSubStrandCatalogEntry {
  id: number;
  code: string;
  name: string;
  description: string;
  sequence: number;
  registered: boolean;
}

export interface CBCStrandCatalogEntry {
  id: number;
  code: string;
  name: string;
  description: string;
  sequence: number;
  registered: boolean;
  any_registered: boolean;
  all_registered: boolean;
  sub_strands: CBCSubStrandCatalogEntry[];
}

export interface CBCCatalogLevel {
  level: string;
  code: string;
  subject_id: number;
  registered: boolean;
  any_registered: boolean;
  all_registered: boolean;
  strands: CBCStrandCatalogEntry[];
}

export interface CBCCatalogSubject {
  name: string;
  code: string;
  levels: CBCCatalogLevel[];
}

export interface CBCCatalog {
  curriculum_id: number;
  curriculum_name: string;
  subjects: CBCCatalogSubject[];
}