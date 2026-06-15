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
