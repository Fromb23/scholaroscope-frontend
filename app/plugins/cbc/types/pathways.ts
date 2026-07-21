import type {
  CbcCohortProfileSummary,
  CbcRegistrationStatus,
  CbcSubjectCategory,
  OfficialPathway,
  OfficialSubjectCombination,
  OfficialSubjectCombinationSubject,
  OfficialTrack,
} from '@/app/core/types/curriculumExtensions';
import type {
  CbcAllowedSubject,
  CbcCohortAllowedSubjects,
  CbcPathwayAllowedSubjectsCatalogue,
} from '@/app/core/types/cbcPathways';

export type { CbcCohortProfileSummary, CbcRegistrationStatus, CbcSubjectCategory };
export type {
  CbcAllowedSubject,
  CbcCohortAllowedSubjects,
  CbcPathwayAllowedSubjectsCatalogue,
};

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

export interface CbcStudentSubjectSwitchOptions {
  student_id: number;
  cohort_id: number | null;
  subject_registration_status: CbcRegistrationStatus | null;
  core: CbcAllowedSubject[];
  pathway_allowed_subjects: CbcAllowedSubject[];
  school_offered_subjects: CbcAllowedSubject[];
  linked_subjects: CbcAllowedSubject[];
  blocked?: CbcAllowedSubject[];
  current_subject_ids: number[];
  current_cohort_subject_ids: number[];
  // Administrative callers may receive the richer cohort configuration
  // snapshot; learner and instructor responses intentionally omit it.
  summary?: CbcCohortAllowedSubjects['summary'];
  pathway?: CbcCohortAllowedSubjects['pathway'];
  track?: CbcCohortAllowedSubjects['track'];
  combination?: CbcCohortAllowedSubjects['combination'];
  pathway_subjects?: CbcAllowedSubject[];
  warnings?: CbcCohortAllowedSubjects['warnings'];
  lock_reason?: string;
}
