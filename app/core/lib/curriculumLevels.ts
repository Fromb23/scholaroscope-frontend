import type { CurriculumType } from '@/app/core/types/academic';

export interface AcademicLevelOption {
  value: string;
  label: string;
}

const CBE_LEVEL_OPTIONS: AcademicLevelOption[] = [
  { value: 'pp1', label: 'Pre-primary 1' },
  { value: 'pp2', label: 'Pre-primary 2' },
  { value: 'grade1', label: 'Grade 1' },
  { value: 'grade2', label: 'Grade 2' },
  { value: 'grade3', label: 'Grade 3' },
  { value: 'grade4', label: 'Grade 4' },
  { value: 'grade5', label: 'Grade 5' },
  { value: 'grade6', label: 'Grade 6' },
  { value: 'grade7', label: 'Grade 7' },
  { value: 'grade8', label: 'Grade 8' },
  { value: 'grade9', label: 'Grade 9' },
  { value: 'grade10', label: 'Grade 10' },
  { value: 'grade11', label: 'Grade 11' },
  { value: 'grade12', label: 'Grade 12' },
];

const STRUCTURED_CURRICULUM_LEVELS: Partial<Record<CurriculumType, AcademicLevelOption[]>> = {
  CBE: CBE_LEVEL_OPTIONS,
};

const LEVEL_LABELS = new Map<string, string>(
  CBE_LEVEL_OPTIONS.map((option) => [option.value, option.label]),
);

const LEVEL_ALIASES = new Map<string, string>();

function compactLevelKey(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function registerAliases(canonical: string, aliases: string[]): void {
  aliases.forEach((alias) => {
    const compact = compactLevelKey(alias);
    if (compact) {
      LEVEL_ALIASES.set(compact, canonical);
    }
  });
}

registerAliases('pp1', [
  'pp1',
  'pre primary 1',
  'pre-primary 1',
  'preprimary1',
  'preprimary 1',
]);
registerAliases('pp2', [
  'pp2',
  'pre primary 2',
  'pre-primary 2',
  'preprimary2',
  'preprimary 2',
]);

for (let grade = 1; grade <= 12; grade += 1) {
  registerAliases(`grade${grade}`, [
    `grade${grade}`,
    `grade ${grade}`,
    `g${grade}`,
  ]);
}

function humanizeAcademicLevel(value: string): string {
  const compact = compactLevelKey(value);
  const canonical = LEVEL_ALIASES.get(compact) ?? value;
  const knownLabel = LEVEL_LABELS.get(canonical);
  if (knownLabel) {
    return knownLabel;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }
  if (/\s/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^([a-zA-Z]+)(\d+)([a-zA-Z]*)$/);
  if (!match) {
    return trimmed;
  }

  const [, prefix, number, suffix] = match;
  const suffixText = suffix ? ` ${suffix.toUpperCase()}` : '';
  return `${prefix.charAt(0).toUpperCase()}${prefix.slice(1).toLowerCase()} ${number}${suffixText}`;
}

export function normalizeAcademicLevel(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const canonical = LEVEL_ALIASES.get(compactLevelKey(trimmed));
  if (canonical) {
    return canonical;
  }

  return trimmed.replace(/\s+/g, '').toLowerCase();
}

export function getCurriculumLevelOptions(curriculumType?: string | null): AcademicLevelOption[] {
  return STRUCTURED_CURRICULUM_LEVELS[curriculumType as CurriculumType] ?? [];
}

export function isStructuredCurriculumLevel(curriculumType?: string | null): boolean {
  return getCurriculumLevelOptions(curriculumType).length > 0;
}

export function getAcademicLevelLabel(
  value: string | null | undefined,
  curriculumType?: string | null,
): string {
  const normalized = normalizeAcademicLevel(value);
  const options = getCurriculumLevelOptions(curriculumType);
  const structuredLabel = options.find((option) => option.value === normalized)?.label;

  if (structuredLabel) {
    return structuredLabel;
  }

  if (normalized) {
    const knownLabel = LEVEL_LABELS.get(normalized);
    if (knownLabel) {
      return knownLabel;
    }
  }

  return humanizeAcademicLevel(String(value ?? ''));
}
