import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

type FilterValue = string | number | null;
type FilterState = Record<string, FilterValue>;

export function usePersistedFilters<T extends FilterState>(
    basePath: string,
    defaults: T
): [T, (updates: Partial<T>) => void, string] {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [filters, setFilters] = useState<T>(() => {
        const initial = { ...defaults };
        for (const key in defaults) {
            const val = searchParams.get(key);
            if (val !== null) {
                const def = defaults[key];
                (initial as FilterState)[key] = typeof def === 'number' ? Number(val) : val;
            }
        }
        return initial;
    });

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
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
    }, [basePath, filters, router, searchParams]);

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
