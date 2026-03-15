// ============================================================================
// app/utils/groupBy.ts
// ============================================================================

/**
 * Groups an array of items by a key derived from each item.
 * Returns a Map (preserves insertion order) where:
 *   - key   → the group identifier
 *   - value → { label, items } where label is a human-readable group name
 *
 * @example
 *   groupBy(sessions, {
 *     keyFn:   (s) => s.cohort_id,
 *     labelFn: (s) => `${s.cohort_name} · ${s.cohort_level}`,
 *   });
 */
export function groupBy<T, K extends string | number>(
    items: T[],
    {
        keyFn,
        labelFn,
    }: {
        keyFn: (item: T) => K;
        labelFn: (item: T) => string;
    }
): Map<K, { label: string; items: T[] }> {
    const map = new Map<K, { label: string; items: T[] }>();

    for (const item of items) {
        const key = keyFn(item);
        const existing = map.get(key);

        if (existing) {
            existing.items.push(item);
        } else {
            map.set(key, { label: labelFn(item), items: [item] });
        }
    }

    return map;
}