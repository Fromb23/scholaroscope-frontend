// ============================================================================
// app/types/session.ts - Updated Session Types
// ============================================================================

export enum SessionType {
  LESSON = 'LESSON',
  PRACTICAL = 'PRACTICAL',
  PROJECT = 'PROJECT',
  EXAM = 'EXAM',
  FIELD_TRIP = 'FIELD_TRIP',
  ASSEMBLY = 'ASSEMBLY',
  OTHER = 'OTHER'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
  SICK = 'SICK'
}

export interface Session {
  linked_cohorts: SessionCohort[];
  id: number;
  cohort_subject: number;
  cohort_id: number;
  cohort_name: string;
  cohort_level: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  curriculum_type: string;
  curriculum_name: string;
  is_current_year: boolean;
  academic_year_id: number;
  term: number | null;
  term_name: string | null;
  session_type: string;
  session_type_display: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  status: string;
  description: string;
  venue: string;
  created_by: string;
  attendance_count: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    sick: number;
    unmarked: number;
  };
  created_at: string;
}

export interface SessionDetail extends Session {
  attendance_records: AttendanceRecord[];
}

export interface AttendanceRecord {
  id: number;
  session: number;
  session_date: string;
  subject_name: string;
  subject_code: string;
  cohort_name: string;
  student: number;
  student_name: string;
  student_admission: string;
  status: string;
  status_display: string;
  notes: string;
  marked_at: string;
  marked_by: string | null;
}

export interface AttendanceSummary {
  present_count: number;
  total_students: number;
  session: Session;
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    sick: number;
    unmarked: number;
    attendance_percentage: number;
  };
}

export interface BulkAttendanceData {
  attendance_records: {
    student_id: number;
    status: string;
    notes?: string;
  }[];
  marked_by?: string;
}

// Form Data Types
export interface SessionFormData {
  cohort_subject: number;
  term: number | null;
  session_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  title: string;
  description: string;
  venue: string;
  auto_create_attendance: boolean;
}

export interface AttendanceFormData {
  session: number;
  student: number;
  status: string;
  notes: string;
}

// Helper type for cohort-subject selection
export interface CohortSubject {
  id: number;
  cohort: number;
  cohort_name: string;
  cohort_level: string;
  subject: number;
  subject_name: string;
  subject_code: string;
  curriculum_name: string;
  is_compulsory: boolean;
  curriculum_type: string;
}

/**
 * Represents a link between a session and a cohort (many-to-many)
 * This is a SYSTEM-WIDE concept, not CBC-specific
 */
export interface SessionCohort {
  is_active: boolean;
  id: number;
  session: number;
  cohort: number;
  cohort_name: string;
  cohort_level: string;
  created_at: string;
}

/**
 * Request payload for linking a cohort to a session
 */
export interface LinkCohortRequest {
  cohort_id: number;
}

/**
 * Response when fetching all cohorts linked to a session
 */
export interface SessionCohortsResponse {
  session_id: number;
  cohorts: SessionCohort[];
  total_learners: number;
}

/**
 * Extended session with linked cohorts
 */
export interface SessionWithCohorts {
  id: number;
  cohort_subject: number;
  session_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  title: string;
  description: string;
  venue: string;
  linked_cohorts: SessionCohort[];
  total_learners: number;
}
