export interface CbcAllowedSubject {
    subject_profile_id: number;
    subject_id: number | null;
    subject_name: string;
    subject_code: string;
    category: 'CORE' | 'PATHWAY' | 'OTHER';
    legal_status: string;
    org_registration_status: string;
    teachability_status: string;
    is_teachable: boolean;
    locked: boolean;
    blocked_reason?: string | null;
    reason?: string | null;
    content_status?: string | null;
    is_content_ready?: boolean;
    platform_subject_id?: number | null;
}

export interface CbcPathwayAllowedSubjectCatalogueItem {
    subject_profile_id: number;
    subject_name: string;
    subject_code: string;
    level: string;
    category: 'CORE' | 'PATHWAY';
    source_document: string;
    version: string;
}

export interface CbcPathwayAllowedSubjectsCatalogue {
    pathway: {
        id: number;
        code: string;
        name: string;
        tracks_count: number;
    };
    level: string | null;
    core: CbcPathwayAllowedSubjectCatalogueItem[];
    pathway_subjects: CbcPathwayAllowedSubjectCatalogueItem[];
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
    blocked: CbcAllowedSubject[];
}
