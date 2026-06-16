export interface CbcAllowedSubject {
    subject_profile_id: number;
    subject_id: number | null;
    cohort_subject_id?: number | null;
    added_to_class?: boolean;
    is_school_offered?: boolean;
    is_linked_to_cohort?: boolean;
    subject_name: string;
    subject_code: string;
    category: 'CORE' | 'PATHWAY' | 'OTHER';
    legal_status: string;
    org_registration_status: string;
    school_offering_status?: string;
    teachability_status: string;
    is_teachable: boolean;
    locked: boolean;
    blocked_reason?: string | null;
    reason?: string | null;
    content_status?: string | null;
    is_content_ready?: boolean;
    platform_subject_id?: number | null;
    ui_status_label?: string | null;
    ui_requirement_label?: string | null;
    ui_action_label?: string | null;
    ui_note?: string | null;
}

export interface CbcClassSubjectSetupSummary {
    status: 'READY' | 'NEEDS_SETUP';
    status_label: string;
    primary_action_label: string;
    pathway_name?: string | null;
    pathway_text: string;
    description: string;
    subjects_added_count: number;
    required_subjects_added_count: number;
    required_subjects_ready_count: number;
    ready_to_add_count: number;
    not_ready_count: number;
}

export interface CbcSetupWarning {
    code: string;
    scope: string;
    subject_names: string[];
    subject_profile_ids: number[];
    message: string;
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
    summary: CbcClassSubjectSetupSummary;
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
    pathway_allowed_subjects: CbcAllowedSubject[];
    pathway_subjects: CbcAllowedSubject[];
    school_offered_subjects: CbcAllowedSubject[];
    linked_subjects: CbcAllowedSubject[];
    blocked: CbcAllowedSubject[];
    warnings?: CbcSetupWarning[];
}
