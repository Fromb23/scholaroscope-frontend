// ============================================================================
// app/core/hooks/useListFilters.ts
// ============================================================================

import { useState } from 'react';

export function useListFilters<T extends Record<string, string>>(
    initialState: T
): {
    filters: T;
    setFilter: (key: keyof T, value: string) => void;
    resetFilters: () => void;
} {
    const [filters, setFilters] = useState<T>(initialState);

    const setFilter = (key: keyof T, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => setFilters(initialState);

    return { filters, setFilter, resetFilters };
}