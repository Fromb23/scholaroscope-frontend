import { useState, useEffect, useCallback } from 'react';
import { auditAPI } from '@/app/plugins/audit/api/audit';
import type { AuditLog, AuditLogFilters, AuditStats } from '@/app/plugins/platform/audit/types/auditLogs';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

export const useAuditLogs = (filters?: AuditLogFilters) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const data = await auditAPI.getAll(filters);
            setLogs(Array.isArray(data) ? data : (data as { results?: AuditLog[] }).results ?? []);
            setError(null);
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to fetch audit logs'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    return { logs, loading, error, refetch: fetchLogs };
};

export const useAuditStats = () => {
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        auditAPI.getStats()
            .then(data => { setStats(data); setError(null); })
            .catch((err: unknown) => {
                setError(extractErrorMessage(err as ApiError, 'Failed to fetch stats'));
            })
            .finally(() => setLoading(false));
    }, []);

    return { stats, loading, error };
};