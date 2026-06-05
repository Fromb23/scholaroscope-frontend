export type CbcSubjectCategory = 'CORE' | 'PATHWAY_COMBINATION' | 'OTHER';
export type CbcRegistrationStatus = 'OPEN' | 'LOCKED';

export interface CbcPathway {
  id: number;
  code: string;
  name: string;
  tracks_count: number;
}

export interface CbcTrack {
  id: number;
  code: string;
  name: string;
  pathway_id: number;
  pathway_name: string;
  pathway_code: string;
}

export interface CbcCombinationSubject {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  level: string;
  sequence: number;
}

export interface CbcSubjectCombination {
  id: number;
  official_code: string;
  name: string;
  pathway_id: number;
  pathway_name: string;
  pathway_code: string;
  track_id: number;
  track_name: string;
  track_code: string;
  subjects: CbcCombinationSubject[];
}

export interface CbcSchoolOfferedCombination {
  id: number;
  organization: number;
  combination: CbcSubjectCombination;
  is_active: boolean;
  created_at: string;
}

export interface CbcCohortProfileSummary {
  pathway_id: number;
  pathway_code: string;
  pathway_name: string;
  track_id: number;
  track_code: string;
  track_name: string;
  combination_id: number;
  combination_code: string;
  combination_name: string;
  offered_combination_id: number;
}

export interface CbcAllowedSubject {
  subject_id: number | null;
  subject_name: string;
  subject_code: string;
  locked?: boolean;
  reason?: string;
}

export interface CbcCohortAllowedSubjects {
  cohort_id: number;
  pathway: {
    id: number;
    code: string;
    name: string;
  } | null;
  track: {
    id: number;
    code: string;
    name: string;
  } | null;
  combination: {
    id: number;
    official_code: string;
    name: string;
  } | null;
  core: CbcAllowedSubject[];
  pathway_subjects: CbcAllowedSubject[];
  blocked: Array<Required<Pick<CbcAllowedSubject, 'subject_name' | 'subject_code'>> & {
    subject_id: number | null;
    reason: string;
  }>;
}

export interface CbcStudentSubjectSwitchOptions extends CbcCohortAllowedSubjects {
  student_id: number;
  subject_registration_status: CbcRegistrationStatus | null;
  lock_reason: string;
  current_subject_ids: number[];
  current_cohort_subject_ids: number[];
}
