import type {
  CbcCohortProfileSummary,
  CbcRegistrationStatus,
  CbcSubjectCategory,
  OfficialPathway,
  OfficialSubjectCombination,
  OfficialSubjectCombinationSubject,
  OfficialTrack,
} from '@/app/core/types/curriculumExtensions';

export type { CbcCohortProfileSummary, CbcRegistrationStatus, CbcSubjectCategory };

export type CbcPathway = OfficialPathway;
export type CbcTrack = OfficialTrack;
export type CbcCombinationSubject = OfficialSubjectCombinationSubject;
export type CbcSubjectCombination = OfficialSubjectCombination;

export interface CbcSchoolOfferedCombination {
  id: number;
  organization: number;
  combination: CbcSubjectCombination;
  is_active: boolean;
  created_at: string;
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
