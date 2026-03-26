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
        const params = new URLSearchParams();
        for (const key in filters) {
            const val = filters[key];
            if (val !== null && val !== undefined && val !== '') {
                params.set(key, String(val));
            }
        }
        router.replace(`${basePath}?${params.toString()}`, { scroll: false });
    }, [filters]);

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