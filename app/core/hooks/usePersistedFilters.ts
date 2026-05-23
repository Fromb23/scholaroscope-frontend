import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

type FilterValue = string | number | null;
type FilterState = Record<string, FilterValue>;

export function usePersistedFilters<T extends FilterState>(
    basePath: string,
    defaults: T,
    options?: { numericKeys?: Array<keyof T>; staleKeys?: string[] }
): [T, (updates: Partial<T>) => void, string] {
    const router = useRouter();
    const searchParams = useSearchParams();
    const numericKeys = new Set<string>((options?.numericKeys ?? []).map(String));
    const staleKeys = useMemo(() => options?.staleKeys ?? [], [options?.staleKeys]);
    const staleKeysSignature = staleKeys.join('|');

    const [filters, setFilters] = useState<T>(() => {
        const initial = { ...defaults };
        for (const key in defaults) {
            const val = searchParams.get(key);
            if (val !== null) {
                const def = defaults[key];
                (initial as FilterState)[key] = (
                    typeof def === 'number' || numericKeys.has(key)
                )
                    ? Number(val)
                    : val;
            }
        }
        return initial;
    });

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        staleKeys.forEach((key) => params.delete(key));
        for (const key in filters) {
            const val = filters[key];
            if (val !== null && val !== undefined && val !== '') {
                params.set(key, String(val));
            } else {
                params.delete(key);
            }
        }
        const nextQuery = params.toString();
        const currentQuery = searchParams.toString();
        if (nextQuery === currentQuery) {
            return;
        }
        router.replace(nextQuery ? `${basePath}?${nextQuery}` : basePath, { scroll: false });
    }, [basePath, filters, router, searchParams, staleKeys, staleKeysSignature]);

    const updateFilters = (updates: Partial<T>) => {
        setFilters(prev => ({ ...prev, ...updates }));
    };

    const backUrl = encodeURIComponent(
        Object.entries(filters)
            .filter(([, v]) => v !== null && v !== '')
            .map(([k, v]) => `${k}=${v}`)
            .join('&')
    );

    return [filters, updateFilters, backUrl];
}
