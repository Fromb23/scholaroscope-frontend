// ============================================================================
// app/types/student.ts - Student Types (Updated for Many-to-Many)
// ============================================================================

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
  completion_date?: string;
  is_active: boolean;
  enrollment_type: 'PRIMARY' | 'ELECTIVE' | 'REMEDIAL' | 'ADVANCED' | 'TRANSFER';
  enrollment_type_display: string;
  notes: string;
  end_reason: 'COMPLETED' | 'GRADUATED' | 'TRANSFERRED' | 'WRONG_ASSIGNMENT' | 'WITHDRAWN' | 'PROMOTED' | null;
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

  status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'SUSPENDED' | 'WITHDRAWN';
  status_display: string;
  enrollment_date: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentDetail extends Student {
  [x: string]: any;
  // All enrollments (active and inactive)
  enrollments: StudentCohortEnrollment[];

  // Current subjects from all active cohorts
  current_subjects: Array<{
    id: number;
    code: string;
    name: string;
    cohort: string;
    is_compulsory: boolean;
  }>;

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

export interface EnrollmentFormData {
  cohort_id: number;
  enrollment_type: 'PRIMARY' | 'ELECTIVE' | 'REMEDIAL' | 'ADVANCED' | 'TRANSFER';
  notes?: string;
}

export interface TransferFormData {
  new_cohort: number;
  transfer_type: 'UPGRADE' | 'TRANSFER' | 'ADDITIONAL';
  deactivate_current: boolean;
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