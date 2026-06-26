import type { CohortSubject } from '@/app/core/types/academic';
import type { CBCCatalog } from '@/app/plugins/cbc/types/cbc';
import { isCbcCurriculum } from '@/app/core/lib/policySurfaces';

export interface CbcSubjectProfileOption {
    id: number;
    label: string;
}

export interface CbcCohortSubjectOption {
    id: number;
    label: string;
    cohortId?: number | null;
    cohortSubjectId?: number | null;
    subjectProfileId?: number | null;
}

type CbcScopedCohortSubject = CohortSubject & {
    cbc_cohort_subject_id?: number | null;
    subject_profile_id?: number | null;
    subject_profile_name?: string | null;
};

export function buildCbcSubjectProfileOptions(catalog?: CBCCatalog | null): CbcSubjectProfileOption[] {
    if (!catalog) return [];

    const seen = new Set<number>();
    const options: CbcSubjectProfileOption[] = [];

    catalog.subjects.forEach((subject) => {
        subject.levels.forEach((level) => {
            if (seen.has(level.subject_profile_id)) return;
            seen.add(level.subject_profile_id);
            options.push({
                id: level.subject_profile_id,
                label: `${subject.code} · ${subject.name} · ${level.level}`,
            });
        });
    });

    return options.sort((left, right) => left.label.localeCompare(right.label));
}

export function buildCbcCohortSubjectOptions(subjects: CohortSubject[]): CbcCohortSubjectOption[] {
    return subjects
        .filter((subject) => isCbcCurriculum(subject))
        .map((subject) => {
            const scopedSubject = subject as CbcScopedCohortSubject;
            const cohortName = scopedSubject.cohort_name?.trim() || 'Selected class';

            return {
                id: scopedSubject.cbc_cohort_subject_id ?? scopedSubject.id,
                label: `${cohortName} · ${scopedSubject.subject_code} · ${scopedSubject.subject_name}`,
                cohortId: scopedSubject.cohort_id ?? scopedSubject.cohort,
                cohortSubjectId: scopedSubject.id,
                subjectProfileId: scopedSubject.subject_profile_id ?? null,
            };
        })
        .sort((left, right) => left.label.localeCompare(right.label));
}
