export interface TeachingProjectionBoundary {
  hasTeachingProjection: boolean;
  hasManagementProjection: boolean;
}

export function shouldApplyTeachingProjection(boundary: TeachingProjectionBoundary): boolean {
  return Boolean(boundary.hasTeachingProjection && !boundary.hasManagementProjection);
}

export function filterByTeachingProjection<T extends { id: number }>(
  items: T[],
  allowedIds: ReadonlySet<number>,
  boundary: TeachingProjectionBoundary,
): T[] {
  return shouldApplyTeachingProjection(boundary)
    ? items.filter(item => allowedIds.has(item.id))
    : items;
}
