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

export interface CbcStudentSubjectSwitchOptions extends CbcCohortAllowedSubjects {
  student_id: number;
  subject_registration_status: CbcRegistrationStatus | null;
  lock_reason: string;
  current_subject_ids: number[];
  current_cohort_subject_ids: number[];
}
