export type CbcSubjectCategory = 'CORE' | 'PATHWAY_COMBINATION' | 'OTHER';
export type CbcRegistrationStatus = 'OPEN' | 'LOCKED';

export interface OfficialPathway {
  id: number;
  code: string;
  name: string;
  tracks_count: number;
}

export interface OfficialTrack {
  id: number;
  code: string;
  name: string;
  pathway_id: number;
  pathway_name: string;
  pathway_code: string;
}

export interface OfficialSubjectCombinationSubject {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  level: string;
  sequence: number;
}

export interface OfficialSubjectCombination {
  id: number;
  official_code: string;
  name: string;
  pathway_id: number;
  pathway_name: string;
  pathway_code: string;
  track_id: number;
  track_name: string;
  track_code: string;
  subjects?: OfficialSubjectCombinationSubject[] | null;
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

export interface OfficialPathwayCatalog {
  listPathways(): Promise<OfficialPathway[]>;
  listTracks(pathwayId: number): Promise<OfficialTrack[]>;
  listCombinations(trackId: number, level: string): Promise<OfficialSubjectCombination[]>;
}
