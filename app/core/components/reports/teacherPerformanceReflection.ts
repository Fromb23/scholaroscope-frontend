import type { TeacherPerformanceReflectionItem } from '../../types/reporting';

export const REFLECTION_PREVIEW_CHAR_LIMIT = 200;
export const MISSING_REFLECTION_TEXT_WARNING =
  'Full reflection text is not available in this report payload.';

export type PreparedTeacherReflectionItem = TeacherPerformanceReflectionItem & {
  canExpand: boolean;
  fullText: string | null;
  hasFullText: boolean;
  hasPayloadWarning: boolean;
  matchKey: string;
  previewText: string;
  rowKey: string;
  sortTimestamp: number;
};

export function buildReflectionSubjectKey(cohortName: string, subjectName: string): string {
  return `${cohortName.trim().toLowerCase()}::${subjectName.trim().toLowerCase()}`;
}

function normalizeReflectionText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function findReflectionPreviewBoundary(value: string, preferredLimit: number): number {
  const cappedPreferredLimit = Math.min(preferredLimit, value.length);

  for (let index = cappedPreferredLimit - 1; index >= 0; index -= 1) {
    const character = value[index];
    if (/\s/.test(character) || /[,.!?;:)\]}]/.test(character)) {
      return index;
    }
  }

  for (let index = cappedPreferredLimit; index < value.length; index += 1) {
    const character = value[index];
    if (/\s/.test(character) || /[,.!?;:)\]}]/.test(character)) {
      return index;
    }
  }

  return value.length;
}

export function buildReflectionPreviewText(value: string): {
  canExpand: boolean;
  previewText: string;
} {
  const normalizedValue = normalizeReflectionText(value);

  if (normalizedValue.length <= REFLECTION_PREVIEW_CHAR_LIMIT) {
    return {
      canExpand: false,
      previewText: normalizedValue,
    };
  }

  const previewEndIndex = findReflectionPreviewBoundary(
    normalizedValue,
    REFLECTION_PREVIEW_CHAR_LIMIT,
  );
  const previewText = normalizedValue
    .slice(0, previewEndIndex)
    .trimEnd()
    .replace(/[,\s;:]+$/, '');

  if (!previewText || previewText.length >= normalizedValue.length) {
    return {
      canExpand: false,
      previewText: normalizedValue,
    };
  }

  return {
    canExpand: true,
    previewText: `${previewText}…`,
  };
}

export function getReflectionSortTimestamp(item: TeacherPerformanceReflectionItem): number {
  const parsedTimestamp = Date.parse(item.session_date || item.created_at);
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0;
}

export function prepareTeacherReflectionItem(
  item: TeacherPerformanceReflectionItem,
): PreparedTeacherReflectionItem {
  const fullText = normalizeReflectionText(item.reflection_text);
  const excerpt = normalizeReflectionText(item.excerpt);
  const hasFullText = fullText.length > 0;
  const previewState = hasFullText
    ? buildReflectionPreviewText(fullText)
    : {
        canExpand: false,
        previewText: excerpt,
      };
  const matchKey = buildReflectionSubjectKey(item.cohort_name, item.subject_name);

  return {
    ...item,
    canExpand: previewState.canExpand,
    fullText: hasFullText ? fullText : null,
    hasFullText,
    hasPayloadWarning: !hasFullText,
    matchKey,
    previewText: previewState.previewText,
    rowKey: [
      item.id ?? 'no-reflection-id',
      item.session_id ?? 'no-session-id',
      item.cohort_subject_id ?? matchKey,
      item.created_at,
    ].join('::'),
    sortTimestamp: getReflectionSortTimestamp(item),
  };
}

export function getReflectionCardBodyText(
  item: PreparedTeacherReflectionItem,
  isExpanded: boolean,
): string {
  if (!item.hasFullText) {
    return item.previewText;
  }

  if (isExpanded || !item.canExpand) {
    return item.fullText ?? '';
  }

  return item.previewText;
}
