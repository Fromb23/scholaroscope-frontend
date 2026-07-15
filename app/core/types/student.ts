// ============================================================================
// app/types/student.ts - Student Types (Updated for Many-to-Many)
// ============================================================================

import type {
  CbcRegistrationStatus,
  CbcSubjectCategory,
} from '@/app/core/types/curriculumExtensions';

export interface CohortEnrollment {
  id: number;
  name: string;
  level: string;
  enrollment_type: 'PRIMARY' | 'ELECTIVE' | 'REMEDIAL' | 'ADVANCED' | 'TRANSFER';
  is_primary: boolean;
}

export interface StudentCohortEnrollment {
  id: number;
  cohort: number;
  cohort_name: string;
  cohort_level: string;
  curriculum_name: string;
  curriculum_type: string;
  enrolled_date: string;
  effective_from?: string;
  effective_to?: string | null;
  completion_date?: string;
  is_active: boolean;
  enrollment_type: 'PRIMARY' | 'ELECTIVE' | 'REMEDIAL' | 'ADVANCED' | 'TRANSFER';
  enrollment_type_display: string;
  notes: string;
  end_reason: 'COMPLETED' | 'GRADUATED' | 'TRANSFERRED' | 'WRONG_ASSIGNMENT' | 'WITHDRAWN' | 'PROMOTED' | null;
  temporal_end_reason?: 'COMPLETION' | 'TRANSFER' | 'WITHDRAWAL' | 'GRADUATION' | 'CORRECTION' | 'PROMOTION' | null;
  subject_registration_status?: CbcRegistrationStatus;
  locked_at?: string | null;
  locked_by?: number | null;
  lock_reason?: string;
}

/** Read-only enrollment shape returned when a learner retrieves their own row. */
export interface LearnerSelfEnrollment {
  id: number;
  cohort: number;
  cohort_name: string;
  cohort_level: string;
  curriculum_name: string;
  curriculum_type: string;
  enrolled_date: string;
  is_active: boolean;
  enrollment_type: 'PRIMARY' | 'ELECTIVE' | 'REMEDIAL' | 'ADVANCED' | 'TRANSFER';
  enrollment_type_display: string;
  subject_registration_status?: CbcRegistrationStatus;
}

export interface StudentSummary {
  id: number;
  admission_number: string;
  full_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  primary_cohort_name?: string | null;
  status?: string;
  status_display?: string;
}

export interface StudentCurrentSubject {
  id: number;
  code: string;
  name: string;
  cohort: string;
  is_compulsory: boolean;
  cohort_id?: number;
  subject_id?: number;
  subject_category?: CbcSubjectCategory;
  locked?: boolean;
  blocked_reason?: string | null;
}

export interface Student {
  id: number;
  admission_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  date_of_birth?: string;
  gender?: string;

  // Primary cohort (main class/year level)
  primary_cohort?: number;
  primary_cohort_name?: string;
  primary_curriculum?: string;

  // All active cohort enrollments
  active_cohorts: CohortEnrollment[];
  cohort_count: number;
  current_subject_ids?: number[];

  status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'SUSPENDED' | 'WITHDRAWN' | 'ARCHIVED';
  status_display: string;
  enrollment_date: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentDetail extends Student {
  [x: string]: unknown;
  // All enrollments (active and inactive)
  enrollments: StudentCohortEnrollment[];

  // Explicit subject participation. `id` is the CohortSubject id.
  current_subjects: StudentCurrentSubject[];

  attendance_summary?: {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  };

  grade_summary?: {
    average_score: number;
    total_assessments: number;
  };
}

export interface StudentFormData {
  admission_number: string;
  cohort: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string;
  primary_cohort?: number;
  email?: string;
  phone?: string;

  // Cohort enrollments for creation
  cohort_enrollments?: Array<{
    cohort_id: number;
    enrollment_type?: 'PRIMARY' | 'ELECTIVE' | 'REMEDIAL' | 'ADVANCED' | 'TRANSFER';
    notes?: string;
  }>;
}

export type StudentProfileUpdateData = Pick<
  StudentFormData,
  | 'admission_number'
  | 'first_name'
  | 'middle_name'
  | 'last_name'
  | 'date_of_birth'
  | 'gender'
  | 'email'
  | 'phone'
>;

export interface EnrollmentFormData {
  cohort_id: number;
  enrollment_type: 'PRIMARY' | 'ELECTIVE' | 'REMEDIAL' | 'ADVANCED' | 'TRANSFER';
  effective_from: string;
  start_reason?: 'INITIAL_ADMISSION' | 'TRANSFER_IN' | 'COHORT_MOVE' | 'RE_ENROLMENT' | 'CORRECTION';
  notes?: string;
}

export interface TransferFormData {
  new_cohort: number;
  effective_from: string;
  notes?: string;
}

export interface LearnerDeleteEligibility {
  allowed: boolean;
  blockers: Record<string, number>;
  recommended_actions: Array<'withdraw' | 'archive' | 'transfer' | 'graduate'>;
  detail: string;
}

export interface LearnerLifecyclePayload {
  effective_date?: string;
  effective_from?: string;
  effective_to?: string;
  reason?: string;
  notes?: string;
}

export interface StudentStats {
  total: number;
  active: number;
  graduated: number;
  transferred: number;
  suspended: number;
  by_gender: Record<string, number>;
}

export const StudentStatuses = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'GRADUATED', label: 'Graduated' },
  { value: 'TRANSFERRED', label: 'Transferred' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export const EnrollmentTypes = [
  { value: 'PRIMARY', label: 'Primary Enrollment' },
  { value: 'ELECTIVE', label: 'Elective Subject' },
  { value: 'REMEDIAL', label: 'Remedial Class' },
  { value: 'ADVANCED', label: 'Advanced Placement' },
  { value: 'TRANSFER', label: 'Transfer' },
];

export const TransferTypes = [
  { value: 'UPGRADE', label: 'Upgrade to next level' },
  { value: 'TRANSFER', label: 'Transfer to different cohort' },
  { value: 'ADDITIONAL', label: 'Add additional cohort' },
];
