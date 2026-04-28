import type { Curriculum } from '@/app/core/types/academic';

export const CAMBRIDGE_BRIDGE_NAME = 'Cambridge';
export const CAMBRIDGE_BRIDGE_CODE = 'CAMBRIDGE';

const CAMBRIDGE_CURRICULUM_TYPES = new Set<string>([
  'CAMBRIDGE',
  'CAM_PRIMARY',
  'CAM_LOWER_SEC',
  'CAM_UPPER_SEC',
  'CAM_ADVANCED',
]);

type CurriculumLike = {
  name?: string | null;
  curriculum_name?: string | null;
  curriculum_type?: string | null;
};

export function isCambridgeCurriculumType(curriculumType?: string | null): boolean {
  return CAMBRIDGE_CURRICULUM_TYPES.has(curriculumType ?? '');
}

export function isCambridgeCurriculumName(name?: string | null): boolean {
  return Boolean(name && /^cambridge(?:\b|[\s(-])/i.test(name.trim()));
}

export function isCambridgeCurriculum(curriculum?: CurriculumLike | null): boolean {
  if (!curriculum) return false;
  return (
    isCambridgeCurriculumType(curriculum.curriculum_type) ||
    isCambridgeCurriculumName(curriculum.name)
  );
}

export function getCurriculumBridgeName(curriculum?: CurriculumLike | null): string {
  if (!curriculum) return '';
  const rawName = curriculum.curriculum_name ?? curriculum.name ?? '';
  return isCambridgeCurriculum(curriculum)
    ? CAMBRIDGE_BRIDGE_NAME
    : rawName;
}

export function getCurriculumBridgeCode(curriculumType?: string | null): string {
  return isCambridgeCurriculumType(curriculumType)
    ? CAMBRIDGE_BRIDGE_CODE
    : (curriculumType ?? '');
}

export function getCurriculumTypeLabel(curriculumType?: string | null): string {
  return isCambridgeCurriculumType(curriculumType)
    ? CAMBRIDGE_BRIDGE_NAME
    : (curriculumType ?? '');
}

export function getCurriculumOptionLabel(curriculum: Pick<Curriculum, 'name' | 'curriculum_type' | 'curriculum_type_display'>): string {
  if (isCambridgeCurriculum(curriculum)) {
    return CAMBRIDGE_BRIDGE_NAME;
  }
  return `${curriculum.name} · ${curriculum.curriculum_type_display}`;
}
