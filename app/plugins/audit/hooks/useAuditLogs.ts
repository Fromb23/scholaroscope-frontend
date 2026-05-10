import { useState, useEffect, useCallback } from 'react';
import { auditAPI } from '@/app/plugins/audit/api/audit';
import type { AuditLog, AuditLogFilters, AuditStats } from '@/app/plugins/audit/types/auditLogs';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

export const useAuditLogs = (filters?: AuditLogFilters) => {
    const search = filters?.search;
    const action = filters?.action;
    const resourceType = filters?.resource_type;
    const organization = filters?.organization;
    const dateFrom = filters?.date_from;
    const dateTo = filters?.date_to;
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const nextFilters: AuditLogFilters = {};
            if (search) nextFilters.search = search;
            if (action) nextFilters.action = action;
            if (resourceType) nextFilters.resource_type = resourceType;
            if (organization !== undefined) nextFilters.organization = organization;
            if (dateFrom) nextFilters.date_from = dateFrom;
            if (dateTo) nextFilters.date_to = dateTo;
            const data = await auditAPI.getAll(
                Object.keys(nextFilters).length > 0 ? nextFilters : undefined
            );
            setLogs(Array.isArray(data) ? data : (data as { results?: AuditLog[] }).results ?? []);
            setError(null);
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to fetch audit logs'));
        } finally {
            setLoading(false);
        }
    }, [action, dateFrom, dateTo, organization, resourceType, search]);

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
