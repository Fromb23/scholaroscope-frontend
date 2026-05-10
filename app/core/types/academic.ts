// ============================================================================
// app/types/academic.ts - Updated Academic Types
// ============================================================================

import type { StudentSummary } from './student';

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
  { value: 'CAMBRIDGE', label: 'Cambridge' },
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
  teachers: Array<Record<string, unknown>>;
  cohorts_offering: {
    cohort_id: number;
    cohort_name: string;
    is_compulsory: boolean;
    cohort_subject_id?: number | null;
    academic_year_name?: string | null;
    learner_count?: number | null;
    available_count?: number | null;
  }[];
}

// Cohort
export interface Cohort {
  id: number;
  name: string;
  curriculum: number;
  curriculum_name: string;
  curriculum_type: CurriculumType;
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
  cohort_id?: number;
  cohort_name: string;
  cohort_level: string;
  subject: number;
  subject_id?: number;
  subject_name: string;
  subject_code: string;
  curriculum_name: string;
  curriculum_type: CurriculumType;
  is_compulsory: boolean;

  has_active_instructor?: boolean;
  active_instructor?: {
    user_id: number;
    full_name: string;
    email: string;
    assigned_at: string;
  } | null;
  current_instructor_id?: number | null;
  current_instructor_name?: string | null;
}

export interface CohortSubjectLearnerCounts {
  enrolled: number;
  available: number;
  cohort_total: number;
}

export interface CohortSubjectLearnerListResponse {
  cohort_subject_id: number;
  cohort_id: number;
  subject_id: number;
  subject_name: string;
  counts: CohortSubjectLearnerCounts;
  enrolled: StudentSummary[];
  available: StudentSummary[];
}

export interface BulkSubjectEnrollResponse {
  cohort_subject_id: number;
  created: number;
  reactivated: number;
  already_active: number;
  rejected: number;
  processed: number;
}

export interface BulkSubjectUnenrollResponse {
  cohort_subject_id: number;
  deactivated: number;
  already_inactive: number;
  missing: number;
  processed: number;
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

export interface InstructorCohortAccessAssignment {
  cohort_id: number;
  cohort_name: string;
  curriculum_id?: number | null;
  curriculum_name: string;
  curriculum_type: string;
  academic_year?: string | null;
  academic_year_id?: number | null;
  academic_year_name?: string | null;
  level?: string | null;
  stream?: string | null;
  students_count?: number | null;
  subjects_count?: number | null;
  is_current_year: boolean;
}

export interface TeachingAssignment {
  source?: string | null;
  subject_source?: string | null;
  teaching_link_id?: number | null;
  cohort_subject_id?: number | null;
  cbc_cohort_subject_id?: number | null;
  cambridge_cohort_subject_id?: number | null;
  cohort_id: number;
  cohort_name: string;
  subject_id: number;
  assigned?: boolean;
  subject_name: string;
  subject_code?: string | null;
  curriculum_name?: string | null;
  level: string;
  academic_year: string;
  is_current_year: boolean;
  curriculum_type: string;
  covered: number;
  total: number;
  start_date: string;
  percentage: number;
  offering_id?: number | null;
}

export interface TeachingCohortSubjectSummary {
  teaching_key: string;
  subject_id: number;
  subject_name: string;
  subject_code?: string | null;
}

export interface TeachingCohortSummary {
  cohort_id: number;
  cohort_name: string;
  level?: string | null;
  curriculum_type?: string | null;
  subject_count: number;
  subjects: TeachingCohortSubjectSummary[];
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
