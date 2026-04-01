import { useState, useEffect, useCallback } from 'react';
import { platformHealthAPI, PlatformHealthResponse } from '@/app/core/api/platformHealth';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

export const usePlatformHealth = () => {
    const [health, setHealth] = useState<PlatformHealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHealth = useCallback(async () => {
        try {
            setLoading(true);
            const data = await platformHealthAPI.getHealth();
            setHealth(data);
            setError(null);
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to fetch platform health'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHealth(); }, [fetchHealth]);

    return { health, loading, error, refetch: fetchHealth };
};