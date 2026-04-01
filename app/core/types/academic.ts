// ============================================================================
// app/types/academic.ts - Updated Academic Types
// ============================================================================

export interface ListQueryParams {
  organization?: number;
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

// Academic Year
export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  terms_count: number;
  cohorts_count: number;
  created_at: string;
  updated_at: string;
}

// Term
export interface Term {
  id: number;
  academic_year: number;
  academic_year_name: string;
  name: string;
  sequence: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export const CURRICULUM_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select curriculum type' },
  { value: '8-4-4', label: '8-4-4' },
  { value: 'CBE', label: 'CBE' },
  { value: 'IGCSE', label: 'IGCSE' },
  { value: 'CUSTOM', label: 'Custom' },
];

export type CurriculumType = typeof CURRICULUM_TYPE_OPTIONS[number]['value'];

export interface Curriculum {
  id: number;
  name: string;
  curriculum_type: CurriculumType;
  curriculum_type_display: string;
  description: string;
  is_active: boolean;
  subjects_count: number;
  cohorts_count: number;
  created_at: string;
}

// Subject
export interface Subject {
  id: number;
  curriculum: number;
  curriculum_name: string;
  curriculum_type: CurriculumType;
  code: string;
  name: string;
  level: string;
  description: string;
  created_at: string;
}

export interface SubjectDetail extends Subject {
  teachers: any[];
  cohorts_offering: {
    cohort_id: number;
    cohort_name: string;
    is_compulsory: boolean;
  }[];
}

// Cohort
export interface Cohort {
  id: number;
  name: string;
  curriculum: number;
  curriculum_name: string;
  academic_year: number;
  academic_year_name: string;
  level: string;
  stream?: string;
  students_count: number;
  subjects_count: number;
  is_current_year: boolean;
  created_at: string;
}

export interface CohortSubject {
  id: number;
  cohort: number;
  cohort_name: string;
  cohort_level: string;
  subject: number;
  subject_name: string;
  subject_code: string;
  curriculum_name: string;
  curriculum_type: CurriculumType;
  is_compulsory: boolean;
}

export interface CohortDetail extends Cohort {
  subjects: CohortSubject[];
}

// Form Data Types
export interface AcademicYearFormData {
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface TermFormData {
  academic_year: number;
  name: string;
  sequence: number;
  start_date: string;
  end_date: string;
}

export interface CurriculumFormData {
  name: string;
  curriculum_type: CurriculumType;
  description: string;
  is_active: boolean;
}

export interface SubjectFormData {
  curriculum: number;
  code: string;
  name: string;
  level: string;
  description: string;
}

export interface CohortFormData {
  name: string;
  curriculum: number;
  academic_year: number;
  level: string;
  stream?: string;
  subjects?: Array<{
    subject_id: number;
    is_compulsory: boolean;
  }>;
}

export interface CohortSubjectFormData {
  subject_id: number;
  is_compulsory: boolean;
}

export interface TermQueryParams {
  academic_year?: number
  organization?: number
}

export interface TeachingAssignment {
  cohort_subject_id: number;
  cohort_id: number;
  cohort_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  level: string;
  academic_year: string;
  is_current_year: boolean;
  curriculum_type: string;
  covered: number;
  total: number;
  start_date: string;
  percentage: number;
}

export interface SyllabusProgress {
  cohort_id: number;
  cohort_name: string;
  academic_year: string;
  subjects: SubjectProgress[];
  overall: { covered: number; total: number; percentage: number };
}

export interface SubjectProgress {
  cohort_subject_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  level: string;
  covered: number;
  total: number;
  percentage: number;
}

export interface HistoryEntry {
  log_id: number;
  cohort_subject_id: number;
  cohort_name: string;
  subject_name: string;
  subject_code: string;
  academic_year: string;
  organization_id: number;
  organization_name: string;
  assigned_at: string;
  unassigned_at: string | null;
  is_active: boolean;
  duration_days: number;
  end_reason: string | null;
  assigned_by: string | null;
  unassigned_by: string | null;
}