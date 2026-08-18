import type {
  SubjectCatalogItem,
  SubjectOfferingCatalogStatus,
} from '@/app/core/types/academic';

export type CatalogBadgeVariant = 'success' | 'warning' | 'danger' | 'default' | 'info';

export interface CatalogSubjectGroup {
  key: string;
  level: string;
  rows: SubjectCatalogItem[];
}

export function getCatalogStatus(item: SubjectCatalogItem): SubjectOfferingCatalogStatus {
  return item.status ?? item.metadata?.offering_status ?? (item.offered ? 'OFFERED' : 'AVAILABLE');
}

export function formatCatalogLevel(level: string): string {
  const normalized = level.trim();
  const gradeMatch = normalized.match(/^grade(\d+)$/i);
  if (gradeMatch) {
    return `Grade ${gradeMatch[1]}`;
  }
  return normalized || 'All levels';
}

export function catalogRowLabel(item: SubjectCatalogItem): string {
  return `${item.name} - ${formatCatalogLevel(item.level)}`;
}

export function statusLabel(item: SubjectCatalogItem): string {
  const metadataLabel = item.metadata?.status_label;
  if (typeof metadataLabel === 'string' && metadataLabel.trim()) {
    return metadataLabel;
  }

  switch (getCatalogStatus(item)) {
    case 'OFFERED':
    case 'REACTIVATED':
      return 'Offered by this workspace';
    case 'DROP_SCHEDULED':
    case 'DROP_PENDING_TERM_CLOSE':
      return 'Scheduled removal';
    case 'DROPPED_HISTORICAL':
      return 'Historical / Dropped';
    case 'AVAILABLE':
    default:
      return 'Available in catalogue';
  }
}

export function statusBadgeVariant(status: SubjectOfferingCatalogStatus): CatalogBadgeVariant {
  switch (status) {
    case 'OFFERED':
    case 'REACTIVATED':
      return 'success';
    case 'DROP_SCHEDULED':
    case 'DROP_PENDING_TERM_CLOSE':
      return 'warning';
    case 'DROPPED_HISTORICAL':
      return 'danger';
    case 'AVAILABLE':
    default:
      return 'default';
  }
}

export function isWorkspaceOffering(item: SubjectCatalogItem): boolean {
  return getCatalogStatus(item) !== 'AVAILABLE' || Boolean(item.org_subject_id || item.offering_id);
}

export function isDroppedHistoricalOffering(item: SubjectCatalogItem): boolean {
  return getCatalogStatus(item) === 'DROPPED_HISTORICAL';
}

export function isSetupReadyWorkspaceOffering(item: SubjectCatalogItem): boolean {
  const status = getCatalogStatus(item);
  return status === 'OFFERED' || status === 'REACTIVATED';
}

export function isScheduledRemoval(item: SubjectCatalogItem): boolean {
  const status = getCatalogStatus(item);
  return status === 'DROP_SCHEDULED' || status === 'DROP_PENDING_TERM_CLOSE';
}

export function isContentReady(item: SubjectCatalogItem): boolean {
  return item.metadata?.is_content_ready !== false;
}

export function isCurriculumImportRequested(item: SubjectCatalogItem): boolean {
  return Boolean(item.metadata?.curriculum_import_requested || item.metadata?.curriculum_import_request);
}

export function contentReadinessLabel(item: SubjectCatalogItem): string {
  if (isContentReady(item)) {
    return 'Content ready';
  }
  return isCurriculumImportRequested(item) ? 'Import requested' : 'Needs curriculum import';
}

export function canOffer(item: SubjectCatalogItem): boolean {
  return Boolean(item.metadata?.can_offer ?? getCatalogStatus(item) === 'AVAILABLE');
}

export function canRemove(item: SubjectCatalogItem): boolean {
  return Boolean(item.metadata?.can_remove ?? getCatalogStatus(item) === 'OFFERED');
}

export function canRestore(item: SubjectCatalogItem): boolean {
  const status = getCatalogStatus(item);
  return Boolean(item.metadata?.can_restore ?? (status === 'DROP_SCHEDULED' || status === 'DROP_PENDING_TERM_CLOSE'));
}

export function canReoffer(item: SubjectCatalogItem): boolean {
  return Boolean(item.metadata?.can_reoffer ?? getCatalogStatus(item) === 'DROPPED_HISTORICAL');
}

export function compareCatalogLevels(left: string, right: string): number {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const rank = (value: string): [number, number | string] => {
    const normalized = normalize(value);
    if (normalized === 'pp1') return [0, 1];
    if (normalized === 'pp2') return [0, 2];
    const gradeMatch = normalized.match(/^grade(\d+)$/);
    if (gradeMatch) {
      return [1, Number(gradeMatch[1])];
    }
    return [2, formatCatalogLevel(value).toLowerCase()];
  };

  const [leftGroup, leftValue] = rank(left);
  const [rightGroup, rightValue] = rank(right);
  if (leftGroup !== rightGroup) {
    return leftGroup - rightGroup;
  }
  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return leftValue - rightValue;
  }
  return String(leftValue).localeCompare(String(rightValue));
}

export function compareCatalogItemsByPriority(left: SubjectCatalogItem, right: SubjectCatalogItem): number {
  const priority = (item: SubjectCatalogItem): number => {
    if (getCatalogStatus(item) === 'OFFERED' || getCatalogStatus(item) === 'REACTIVATED') {
      return 0;
    }
    return isContentReady(item) ? 1 : 2;
  };
  const priorityGap = priority(left) - priority(right);
  if (priorityGap !== 0) return priorityGap;
  const levelGap = compareCatalogLevels(left.level, right.level);
  if (levelGap !== 0) return levelGap;
  const nameGap = left.name.localeCompare(right.name);
  if (nameGap !== 0) return nameGap;
  return String(left.id).localeCompare(String(right.id));
}

export function curriculumImportRequestPayload(
  item: SubjectCatalogItem,
  curriculumId: number,
) {
  return {
    curriculum: curriculumId,
    catalog_subject_id: item.catalog_subject_id,
    subject_code: item.subject_code ?? item.code,
    subject_name: item.name,
    level: item.level,
    platform_subject_id:
      typeof item.metadata?.platform_subject_id === 'number'
        ? item.metadata.platform_subject_id
        : null,
    content_status:
      typeof item.metadata?.content_status === 'string'
        ? item.metadata.content_status
        : undefined,
  };
}

export function groupRowsByLevel(catalog: SubjectCatalogItem[]): CatalogSubjectGroup[] {
  const groups = new Map<string, SubjectCatalogItem[]>();
  catalog.forEach((item) => {
    const level = item.level || 'all';
    groups.set(level, [...(groups.get(level) ?? []), item]);
  });

  return Array.from(groups.entries())
    .map(([level, rows]) => ({
      key: level,
      level,
      rows: rows.sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => compareCatalogLevels(left.level, right.level));
}

export function uniqueCatalogLevels(catalog: SubjectCatalogItem[]): string[] {
  return Array.from(new Set(catalog.map((item) => item.level || 'all')))
    .sort(compareCatalogLevels);
}

export function matchesCatalogSearch(item: SubjectCatalogItem, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }
  return [
    item.name,
    item.title,
    item.code,
    item.subject_code,
    item.level,
    formatCatalogLevel(item.level),
  ].some((value) => String(value ?? '').toLowerCase().includes(query));
}

export function contentMissingMessage(item: SubjectCatalogItem): string {
  return `${item.name} - ${formatCatalogLevel(item.level)} is available in the CBC catalogue, but its teaching content has not been imported into Scholaroscope yet. You cannot offer it for teaching until the curriculum design is imported.`;
}
