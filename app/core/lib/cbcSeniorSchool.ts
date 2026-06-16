import { normalizeAcademicLevel } from '@/app/core/lib/curriculumLevels';

interface CurriculumLevelLike {
    curriculum_type?: string | null;
    level?: string | null;
}

interface CbcProfileLike {
    cbc_profile?: unknown | null;
}

export { normalizeAcademicLevel } from '@/app/core/lib/curriculumLevels';

export function isCbcSeniorLevel(level: string | null | undefined): boolean {
    const normalized = normalizeAcademicLevel(level);
    return normalized === 'grade10' || normalized === 'grade11' || normalized === 'grade12';
}

export function isCbcSeniorSchoolEntity(value: CurriculumLevelLike | null | undefined): boolean {
    return value?.curriculum_type === 'CBE' && isCbcSeniorLevel(value.level);
}

export function hasCbcPathwayProfile(value: CbcProfileLike | null | undefined): boolean {
    return Boolean(value?.cbc_profile);
}
