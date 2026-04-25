// ============================================================================
// app/plugins/cambridge/types.ts
//
// Cambridge International curriculum domain types.
// Aligned to backend Cambridge service layer.
// ============================================================================

export type CambridgeProgramme = 'PRIMARY' | 'LOWER_SECONDARY' | 'UPPER_SECONDARY' | 'ADVANCED';

export type CambridgeLevel =
  | 'Stage1'
  | 'Stage2'
  | 'Stage3'
  | 'Stage4'
  | 'Stage5'
  | 'Stage6'
  | 'IGCSE'
  | 'AS_LEVEL'
  | 'A_LEVEL';

export type AssessmentComponentType = 'WRITTEN' | 'COURSEWORK' | 'ORAL' | 'PRACTICAL';

export type ObjectiveLevel = 'CORE' | 'EXTENDED' | 'SUPPLEMENT';

// ============================================================================
// Subject layer
// ============================================================================

export interface CambridgeSubject {
  id: number;
  programme: CambridgeProgramme;
  level: CambridgeLevel;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  content_area_count: number;
  assessment_component_count: number;
  created_at: string;
  updated_at: string;
}

export interface CambridgeSubjectDetail extends CambridgeSubject {
  content_areas: ContentArea[];
  assessment_components: AssessmentComponent[];
}

// ============================================================================
// Content area / syllabus layer
// ============================================================================

export interface ContentArea {
  id: number;
  subject: number;
  subject_name: string;
  name: string;
  code: string;
  description: string;
  sequence: number;
  topic_count: number;
}

export interface ContentAreaDetail extends ContentArea {
  topics: Topic[];
}

export interface Topic {
  id: number;
  content_area: number;
  content_area_name: string;
  name: string;
  code: string;
  description: string;
  sequence: number;
  objective_count: number;
}

export interface TopicDetail extends Topic {
  learning_objectives: LearningObjective[];
}

export interface LearningObjective {
  id: number;
  topic: number;
  topic_name: string;
  code: string;
  description: string;
  level: ObjectiveLevel;
  sequence: number;
}

// ============================================================================
// Assessment layer
// ============================================================================

export interface AssessmentComponent {
  id: number;
  subject: number;
  subject_name: string;
  name: string;
  code: string;
  component_type: AssessmentComponentType;
  weight: number;
  duration_minutes: number | null;
  max_marks: number;
}

// ============================================================================
// Progress layer
// ============================================================================

export interface CambridgeProgress {
  student_id: number;
  student_name: string;
  admission_number: string;
  subject_id: number;
  subject_name: string;
  programme: CambridgeProgramme;
  level: CambridgeLevel;
  overall_percentage: number;
  grade: string | null;
  content_area_progress: ContentAreaProgress[];
  assessment_results: AssessmentResult[];
}

export interface ContentAreaProgress {
  content_area_id: number;
  content_area_name: string;
  content_area_code: string;
  total_objectives: number;
  completed_objectives: number;
  percentage: number;
}

export interface AssessmentResult {
  component_id: number;
  component_name: string;
  component_code: string;
  score: number | null;
  max_marks: number;
  percentage: number | null;
  grade: string | null;
}

export interface ClassProgressEntry {
  student_id: number;
  student_name: string;
  admission_number: string;
  overall_percentage: number;
  grade: string | null;
  content_areas_completed: number;
  total_content_areas: number;
}

// ============================================================================
// Installation / configuration
// ============================================================================

export interface ProgrammeConfig {
  programme: CambridgeProgramme;
  levels: CambridgeLevel[];
  subject_count: number;
}

export interface CambridgeInstallationStatus {
  is_installed: boolean;
  is_active: boolean;
  programmes: ProgrammeConfig[];
  enabled: boolean;
}

// ============================================================================
// Form data — server generates code/sequence where applicable
// ============================================================================

export interface CambridgeSubjectFormData {
  programme: CambridgeProgramme;
  level: CambridgeLevel;
  name: string;
  code: string;
  description?: string;
}

export interface RenameSubjectData {
  name: string;
}

export interface ContentAreaFormData {
  subject: number;
  name: string;
  code: string;
  description?: string;
}

export interface TopicFormData {
  content_area: number;
  name: string;
  code: string;
  description?: string;
}

export interface LearningObjectiveFormData {
  topic: number;
  code: string;
  description: string;
  level?: ObjectiveLevel;
}

export interface AssessmentComponentFormData {
  subject: number;
  name: string;
  code: string;
  component_type: AssessmentComponentType;
  weight: number;
  duration_minutes?: number | null;
  max_marks: number;
}

// ============================================================================
// Filter params
// ============================================================================

export interface SubjectFilterParams {
  programme?: CambridgeProgramme;
  level?: CambridgeLevel;
  search?: string;
}

export interface ProgressFilterParams {
  cohort_id?: number;
  subject_id?: number;
  programme?: CambridgeProgramme;
  level?: CambridgeLevel;
}
